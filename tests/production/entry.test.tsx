import { expect, test } from "vitest";
import { commands } from "vitest/browser";

for (const app of ["desktop", "about", "music", "navigation"] as const) {
  test(`built ${app} entry loads its assets and renders independently`, async () => {
    const result = await commands.inspectBuiltApp(app);
    if (app === "desktop" || app === "navigation") {
      expect(result.serverStatus).toBe(200);
      expect(result.notFoundStatus).toBe(404);
      expect(result.serverHtml).toContain('lang="zh-CN"');
      expect(result.serverHtml).toMatch(/<title\b[^>]*>[^<]+/);
      expect(result.serverHtml).toContain('name="description"');
      expect(result.serverHtml).toContain('rel="canonical"');
      expect(result.serverHtml).toContain('property="og:title"');
      expect(result.serverHtml).toContain(
        app === "desktop" ? "搜索关键词" : "搜索网站",
      );
      expect(result.serverHtml).toContain("q:container");
    }
    if (app === "desktop")
      expect(result.navigationHtml).toContain("Server catalog fixture");
    expect(result.errors).toEqual([]);
    expect(result.missing).toEqual([]);
    expect(result.stylesheets).toBeGreaterThan(0);
    expect(result.title).toMatch(/draco|Draco/);
    expect(result.text.length).toBeGreaterThan(10);
  });
}
