import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getPageSeo,
  PUBLIC_PATHS,
  serializeJsonLd,
} from "../../apps/desktop/src/features/seo/metadata";

describe("public page metadata", () => {
  it("gives every public page unique Chinese metadata and an absolute canonical", () => {
    const pages = PUBLIC_PATHS.map((path) =>
      getPageSeo(`https://preview.invalid${path}?utm_source=test`),
    );
    expect(new Set(pages.map((page) => page.title)).size).toBe(
      PUBLIC_PATHS.length,
    );
    expect(new Set(pages.map((page) => page.description)).size).toBe(
      PUBLIC_PATHS.length,
    );
    pages.forEach((page, index) => {
      expect(page.canonical).toBe(`https://draco.dev${PUBLIC_PATHS[index]}`);
      expect(page.indexable).toBe(true);
      expect(page.structuredData).toBeDefined();
    });
  });
  it("canonicalizes legacy app links and trailing slashes", () => {
    expect(getPageSeo("/?app=about&path=%2F").canonical).toBe(
      "https://draco.dev/about",
    );
    expect(getPageSeo("/navigation/").canonical).toBe(
      "https://draco.dev/navigation",
    );
  });
  it("keeps utility, unknown and external browser destinations out of the index", () => {
    for (const input of [
      "/?app=settings",
      "/?app=browser&path=https://example.com",
      "/code",
      "/tools",
      "/unknown",
    ]) {
      const page = getPageSeo(input);
      expect(page.robots).toBe("noindex, follow");
      expect(page.structuredData).toBeUndefined();
      expect(page.canonical).not.toContain("example.com");
    }
  });
  it("links the about profile to the actual person without invented ratings or dates", () => {
    const graph = getPageSeo("/about").structuredData?.["@graph"];
    expect(graph?.at(-1)).toMatchObject({
      "@type": "ProfilePage",
      mainEntity: { "@id": "https://draco.dev/about#person" },
    });
    expect(JSON.stringify(graph)).not.toMatch(
      /aggregateRating|dateModified|datePublished/,
    );
  });
  it("escapes script endings while preserving JSON data", () => {
    const value = { text: "</script><script>alert('x')</script>&\u2028" };
    const result = serializeJsonLd(value);
    expect(result).not.toContain("<");
    expect(JSON.parse(result)).toEqual(value);
  });
});

describe("standalone app metadata", () => {
  it.each(["about", "music"])(
    "keeps %s aligned with its public SSR canonical",
    (app) => {
      const html = readFileSync(
        new URL(`../../apps/${app}/index.html`, import.meta.url),
        "utf8",
      );
      const page = getPageSeo(`/${app}`);
      expect(html).toContain(`<title>${page.title}</title>`);
      expect(html).toContain(
        `name="description" content="${page.description}"`,
      );
      expect(html).toContain(`rel="canonical" href="${page.canonical}"`);
      expect(html).toContain('lang="zh-CN"');
      expect(html).toContain(
        'name="twitter:card" content="summary_large_image"',
      );
    },
  );
});

describe("crawler entry points", () => {
  it("publishes each public canonical once in the sitemap", () => {
    const xml = readFileSync(
      new URL("../../public/sitemap.xml", import.meta.url),
      "utf8",
    );
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1],
    );
    expect(urls).toEqual(
      PUBLIC_PATHS.map((path) => getPageSeo(path).canonical),
    );
    expect(xml).not.toContain("<lastmod>");
  });
  it("advertises the sitemap while allowing rendering assets to be crawled", () => {
    const robots = readFileSync(
      new URL("../../public/robots.txt", import.meta.url),
      "utf8",
    );
    expect(robots).toContain("Sitemap: https://draco.dev/sitemap.xml");
    expect(robots).toContain("Disallow: /api/");
    expect(robots).not.toMatch(/Disallow: \/(?:build|assets)\//);
  });
});
