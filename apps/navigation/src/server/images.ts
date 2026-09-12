import type {
  D1Database,
  D1PreparedStatement,
  R2Bucket,
} from "@cloudflare/workers-types";

const MAX_BYTES = 256 * 1024;
export const IMAGE_BATCH_SIZE = 30;
export function iconSourceUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, "https://chuangzaoshi.com/");
    return url.origin === "https://chuangzaoshi.com" &&
      url.pathname.startsWith("/assets/") &&
      !url.pathname.endsWith("/") &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export async function fetchIcon(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  if (iconSourceUrl(url) !== url) throw new Error("image source not allowed");
  const response = await fetcher(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Accept:
        "image/png,image/jpeg,image/webp,image/avif,image/gif,image/x-icon",
    },
  });
  if (!response.ok || !response.body) throw new Error("image unavailable");
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.length;
      if (length > MAX_BYTES) {
        await reader.cancel();
        throw new Error("image too large");
      }
      parts.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  const starts = (...signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);
  const text = (start: number, end: number) =>
    new TextDecoder().decode(bytes.subarray(start, end));
  const mime = starts(137, 80, 78, 71, 13, 10, 26, 10)
    ? "image/png"
    : starts(255, 216, 255)
      ? "image/jpeg"
      : text(0, 4) === "RIFF" && text(8, 12) === "WEBP"
        ? "image/webp"
        : ["GIF87a", "GIF89a"].includes(text(0, 6))
          ? "image/gif"
          : starts(0, 0, 1, 0)
            ? "image/x-icon"
            : text(4, 8) === "ftyp" && ["avif", "avis"].includes(text(8, 12))
              ? "image/avif"
              : null;
  const declared = response.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (!mime || !declared?.startsWith("image/"))
    throw new Error("invalid image type");
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192)
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return `data:${mime};base64,${btoa(binary)}`;
}
export async function syncImages(
  db: D1Database,
  bucket: R2Bucket,
  fetcher: typeof fetch = fetch,
  now = new Date(),
) {
  const pending = await db
    .prepare(
      `SELECT DISTINCT json_extract(s.payload,'$.iconSource') AS url,i.data_url FROM navigation_sites s LEFT JOIN navigation_images i ON i.url=json_extract(s.payload,'$.iconSource') WHERE json_extract(s.payload,'$.iconSource') IS NOT NULL AND (i.url IS NULL OR (i.icon_url IS NULL AND (i.data_url IS NOT NULL OR i.attempted_at < ?))) LIMIT ?`,
    )
    .bind(new Date(now.getTime() - 86_400_000).toISOString(), IMAGE_BATCH_SIZE)
    .all<{ url: string; data_url?: string }>();
  const statements: D1PreparedStatement[] = [];
  let saved = 0;
  for (const { url, data_url } of pending.results) {
    let data: string | null = null;
    try {
      const source = data_url || (await fetchIcon(url, fetcher));
      const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/.exec(source);
      if (!match) throw new Error("invalid cached image");
      const bytes = Uint8Array.from(atob(match[2]), (char) =>
        char.charCodeAt(0),
      );
      const hash = [
        ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      ]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      await bucket.put(hash, bytes, {
        httpMetadata: { contentType: match[1] },
      });
      data = `/api/navigation?icon=${hash}`;
      saved++;
    } catch {
      /* Retry failed images on the following day. */
    }
    statements.push(
      db
        .prepare(
          `INSERT INTO navigation_images(url,icon_url,attempted_at) VALUES(?,?,?) ON CONFLICT(url) DO UPDATE SET icon_url=COALESCE(excluded.icon_url,navigation_images.icon_url),data_url=CASE WHEN excluded.icon_url IS NOT NULL THEN NULL ELSE navigation_images.data_url END,attempted_at=excluded.attempted_at`,
        )
        .bind(url, data, now.toISOString()),
    );
  }
  if (statements.length) await db.batch(statements);
  return { attempted: pending.results.length, saved };
}
