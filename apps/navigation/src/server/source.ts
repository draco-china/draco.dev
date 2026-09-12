import { iconSourceUrl } from "./images";

export const sourcePages = [
  "https://chuangzaoshi.com/",
  "https://chuangzaoshi.com/code",
  "https://chuangzaoshi.com/product",
  "https://chuangzaoshi.com/operate",
  "https://chuangzaoshi.com/designtool",
  "https://chuangzaoshi.com/codetool",
  "https://chuangzaoshi.com/geek",
  "https://chuangzaoshi.com/model",
  "https://chuangzaoshi.com/nature",
  "https://chuangzaoshi.com/job",
] as const;
export interface SourceSite {
  section: "websites" | "downloads";
  group: string;
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  tags: string[];
  icon: string;
  iconSource?: string;
  iconDataUrl?: string;
}
export function directUrl(value: string | null): string | null {
  try {
    const url = new URL(value ?? "");
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      !url.hostname.includes(".") ||
      /^(localhost|127\.|10\.|192\.168\.)/.test(url.hostname)
    )
      return null;
    if (
      url.hostname.endsWith("chuangzaoshi.com") &&
      /^\/go\/?$/i.test(url.pathname)
    )
      return null;
    for (const key of [...url.searchParams.keys()])
      if (/^(utm_|mtm_|inviteCode$|srfp$|tn$)/i.test(key))
        url.searchParams.delete(key);
    return url.href;
  } catch {
    return null;
  }
}
export async function parseSource(
  html: string,
  section: SourceSite["section"] = "websites",
  primaryGroup = "设计",
): Promise<Omit<SourceSite, "id">[]> {
  const sites: Omit<SourceSite, "id">[] = [];
  let group = "",
    groupText = "",
    name = "",
    description = "",
    target: string | null = null,
    iconSource: string | undefined;
  const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
  await new HTMLRewriter()
    .on(".panel-title", {
      element(element) {
        groupText = "";
        element.onEndTag(() => {
          group = normalize(groupText);
        });
      },
      text(chunk) {
        groupText += chunk.text;
      },
    })
    .on(".card:not(.panel-title), .tool", {
      element(element) {
        target = null;
        name = "";
        description = "";
        iconSource = undefined;
        element.onEndTag(() => {
          const title = normalize(name);
          if (
            target &&
            title &&
            title.length <= 100 &&
            group &&
            group.length <= 100
          )
            sites.push({
              section,
              group: primaryGroup,
              name: title,
              url: target,
              category: group,
              description:
                normalize(description) ||
                `${group}${section === "downloads" ? "软件与工具" : "相关网站"}`,
              tags: [],
              icon: title.charAt(0),
              ...(iconSource ? { iconSource } : {}),
            });
        });
      },
    })
    .on("a.card-heading, a.tool-heading", {
      element(element) {
        target = directUrl(element.getAttribute("title"));
      },
    })
    .on(".card-body, .tool-body", {
      text(chunk) {
        description += chunk.text;
      },
    })
    .on(".card-heading img, .tool-heading img", {
      element(element) {
        iconSource = iconSourceUrl(element.getAttribute("src")) ?? undefined;
      },
    })
    .on(".card-heading .card-title, .tool-heading .tool-title", {
      text(chunk) {
        name += chunk.text;
      },
    })
    .transform(new Response(html))
    .text();
  return sites;
}
export async function fetchSourcePage(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  if (!(sourcePages as readonly string[]).includes(url))
    throw new Error("source not allowed");
  const response = await fetcher(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    headers: {
      "User-Agent": "draco.dev navigation catalog sync",
      Accept: "text/html",
    },
  });
  if (
    !response.ok ||
    !response.body ||
    !response.headers.get("content-type")?.includes("text/html")
  )
    throw new Error("source unavailable");
  const reader = response.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > 5_000_000) {
        await reader.cancel();
        throw new Error("source too large");
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}
export async function collectSource(
  fetcher: typeof fetch = fetch,
  pause = () => new Promise<void>((resolve) => setTimeout(resolve, 1000)),
): Promise<SourceSite[]> {
  const unique = new Map<string, Omit<SourceSite, "id">>();
  for (const [index, url] of sourcePages.entries()) {
    if (index) await pause();
    const sites = await parseSource(
      await fetchSourcePage(url, fetcher),
      url.endsWith("tool") ? "downloads" : "websites",
      (
        {
          "/": "设计",
          "/code": "前端",
          "/product": "产品",
          "/operate": "运营",
          "/designtool": "设计",
          "/codetool": "前端",
          "/geek": "极客世界",
          "/model": "3D打印",
          "/nature": "自然艺术",
          "/job": "工作兼职",
        } as Record<string, string>
      )[new URL(url).pathname],
    );
    const minimum =
      ({ "/model": 3, "/nature": 4, "/job": 3 } as Record<string, number>)[
        new URL(url).pathname
      ] ?? 10;
    if (sites.length < minimum)
      throw new Error(
        `source structure changed: ${url} (${sites.length} entries)`,
      );
    for (const site of sites)
      if (!unique.has(`${site.section}:${site.group}:${site.url}`))
        unique.set(`${site.section}:${site.group}:${site.url}`, site);
  }
  const result: SourceSite[] = [];
  for (const site of unique.values()) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${site.section}:${site.group}:${site.url}`),
    );
    const id = `czs-${Array.from(new Uint8Array(digest), (x) =>
      x.toString(16).padStart(2, "0"),
    )
      .join("")
      .slice(0, 24)}`;
    result.push({ id, ...site });
  }
  return result;
}
