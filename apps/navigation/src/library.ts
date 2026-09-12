import { categories, presetSites } from "./catalog";
import type { Site } from "./model";

export interface NavigationLibrary {
  sites: Site[];
  categories: string[];
  updatedAt: string | null;
}
export const fallbackLibrary = (): NavigationLibrary => ({
  sites: presetSites.map((site) => ({ ...site, tags: [...site.tags] })),
  categories: [...categories],
  updatedAt: null,
});
function safeRemoteUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
export function parseLibrary(value: unknown): NavigationLibrary {
  const raw = value as NavigationLibrary;
  if (
    !raw ||
    !Array.isArray(raw.sites) ||
    !raw.sites.length ||
    raw.sites.length > 1500 ||
    !Array.isArray(raw.categories) ||
    raw.categories.some((c) => typeof c !== "string" || c.length > 100) ||
    !(raw.updatedAt === null || typeof raw.updatedAt === "string")
  )
    throw new Error("导航目录不可用");
  const ids = new Set<string>();
  for (const site of raw.sites) {
    if (
      !site ||
      typeof site.id !== "string" ||
      !site.id ||
      ids.has(site.id) ||
      typeof site.name !== "string" ||
      !site.name.trim() ||
      site.name.length > 100 ||
      typeof site.url !== "string" ||
      !safeRemoteUrl(site.url) ||
      typeof site.category !== "string" ||
      (site.group !== undefined && typeof site.group !== "string") ||
      typeof site.description !== "string" ||
      typeof site.icon !== "string" ||
      (site.iconUrl !== undefined &&
        (typeof site.iconUrl !== "string" ||
          !/^\/api\/navigation\?icon=(?:[a-f0-9]{64}|czs-[a-f0-9]+)$/.test(
            site.iconUrl,
          ))) ||
      (site.iconDataUrl !== undefined &&
        (typeof site.iconDataUrl !== "string" ||
          site.iconDataUrl.length > 350000 ||
          !/^data:image\/(?:png|jpeg|webp|avif|gif|x-icon|vnd\.microsoft\.icon|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/.test(
            site.iconDataUrl,
          ))) ||
      (site.section !== undefined &&
        site.section !== "websites" &&
        site.section !== "downloads") ||
      !Array.isArray(site.tags) ||
      site.tags.some((tag) => typeof tag !== "string")
    )
      throw new Error("导航目录内容不正确");
    ids.add(site.id);
  }
  return {
    sites: raw.sites.map((site) => ({ ...site, tags: [...site.tags] })),
    categories: [
      ...new Set(
        [...raw.categories, ...raw.sites.map((site) => site.category)].filter(
          Boolean,
        ),
      ),
    ],
    updatedAt: raw.updatedAt,
  };
}
// Only requests are shared. Data remains owned by each mounted application.
const pending = new Map<string, Promise<NavigationLibrary>>();
export function loadNavigationLibrary(
  view: "all" | "featured" = "all",
): Promise<NavigationLibrary> {
  const existing = pending.get(view);
  if (existing) return existing;
  const request = (async () => {
    const response = await fetch(
      view === "featured" ? "/api/navigation?view=featured" : "/api/navigation",
      {
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) throw new Error("导航目录暂时不可用");
    const limit = 20 * 1024 * 1024;
    if (Number(response.headers.get("content-length")) > limit)
      throw new Error("导航目录过大");
    if (!response.body) throw new Error("导航目录不可用");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        bytes += result.value.byteLength;
        if (bytes > limit) {
          await reader.cancel();
          throw new Error("导航目录过大");
        }
        chunks.push(result.value);
      }
    } finally {
      reader.releaseLock();
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    return parseLibrary(JSON.parse(new TextDecoder().decode(buffer)));
  })().finally(() => {
    pending.delete(view);
  });
  pending.set(view, request);
  return request;
}
export function librarySites(
  library: NavigationLibrary,
  query = "",
  category = "",
  section: "websites" | "downloads" = "websites",
) {
  const seen = new Set<string>();
  return library.sites.filter((site) => {
    const url = `${site.section || "websites"}:${new URL(site.url).href.replace(/\/$/, "")}`;
    if (seen.has(url)) return false;
    seen.add(url);
    return (
      (site.section || "websites") === section &&
      (!category || site.category === category) &&
      `${site.name} ${site.description} ${site.tags.join(" ")}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    );
  });
}
