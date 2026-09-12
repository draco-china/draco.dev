import type { NavigationEnv } from "./env";

export async function iconResponse(
  request: Request,
  env: NavigationEnv,
  icon: string,
) {
  let key = icon;
  const immutable = /^[a-f0-9]{64}$/.test(icon);
  if (!immutable) {
    if (!/^czs-[a-f0-9]+$/.test(icon))
      return new Response(null, { status: 404 });
    const row = await env.DB.prepare(
      "SELECT COALESCE(i.icon_url,f.icon_url) AS icon_url FROM navigation_sites s LEFT JOIN navigation_images i ON i.url=json_extract(s.payload,'$.iconSource') LEFT JOIN navigation_images f ON f.url=json_extract(s.payload,'$.iconFallbackSource') WHERE s.source='chuangzaoshi' AND s.id=?",
    )
      .bind(icon)
      .first<{ icon_url: string | null }>();
    key = row?.icon_url?.split("?icon=")[1] || "";
    if (!/^[a-f0-9]{64}$/.test(key))
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
  }
  const object = await env.ICONS.get(key);
  if (!object)
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  const headers = new Headers({
    "Cache-Control": immutable
      ? "public, max-age=31536000, immutable"
      : "public, max-age=1800",
    ETag: object.httpEtag,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  });
  object.writeHttpMetadata(headers);
  if (request.headers.get("If-None-Match") === object.httpEtag)
    return new Response(null, { status: 304, headers });
  return new Response(await object.arrayBuffer(), { headers });
}
