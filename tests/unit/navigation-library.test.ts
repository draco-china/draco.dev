import { afterEach, expect, test, vi } from "vitest";
import {
  fallbackLibrary,
  librarySites,
  loadNavigationLibrary,
  parseLibrary,
} from "../../apps/navigation/src/library";

afterEach(() => vi.unstubAllGlobals());
const library = () => ({
  sites: [
    {
      id: "remote",
      name: "Remote",
      url: "https://example.org",
      category: "设计",
      description: "",
      icon: "R",
      tags: [],
    },
  ],
  categories: ["设计"],
  updatedAt: null,
});
test("remote library replaces defaults", () => {
  const remote = parseLibrary(library());
  expect(librarySites(remote)).toHaveLength(1);
  expect(librarySites(remote, "remote", "设计")[0].id).toBe("remote");
  expect(librarySites(remote, "GitHub")).toEqual([]);
  expect(fallbackLibrary().sites.length).toBeGreaterThan(20);
});
test("concurrent requests share work, and a failed request can be retried", async () => {
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(new Response(JSON.stringify(library())));
  vi.stubGlobal("fetch", fetcher);
  const first = loadNavigationLibrary();
  expect(loadNavigationLibrary()).toBe(first);
  await expect(first).rejects.toThrow("offline");
  expect((await loadNavigationLibrary()).sites[0].id).toBe("remote");
  expect(fetcher).toHaveBeenCalledTimes(2);
});
test("empty and unsafe remote data cannot replace fallback", () => {
  expect(() => parseLibrary({ ...library(), sites: [] })).toThrow();
  const invalid = library();
  invalid.sites[0].url = "javascript:alert(1)";
  expect(() => parseLibrary(invalid)).toThrow();
});

test("website and download sections preserve distinct entries with the same URL", () => {
  const source = library();
  const remote = parseLibrary({
    ...source,
    sites: [
      { ...source.sites[0], group: "设计", section: "websites" },
      {
        ...source.sites[0],
        id: "download",
        group: "设计",
        section: "downloads",
      },
    ],
  });
  expect(librarySites(remote).map((site) => site.id)).toEqual(["remote"]);
  expect(
    librarySites(remote, "", "", "downloads").map((site) => site.id),
  ).toEqual(["download"]);
  expect(() =>
    parseLibrary({
      ...source,
      sites: [{ ...source.sites[0], section: "invalid" }],
    }),
  ).toThrow();
});

test("catalog accepts bounded image data URLs and rejects remote or executable icon sources", () => {
  const source = library();
  const withIcon = (iconDataUrl: unknown) => ({
    ...source,
    sites: [{ ...source.sites[0], iconDataUrl }],
  });
  const svg = "data:image/svg+xml;base64,PHN2Zy8+";
  expect(parseLibrary(withIcon(svg)).sites[0].iconDataUrl).toBe(svg);
  for (const value of [
    "https://example.org/icon.png",
    "data:text/html;base64,PHN2Zy8+",
    "javascript:alert(1)",
    `data:image/png;base64,${"A".repeat(350000)}`,
  ]) {
    expect(() => parseLibrary(withIcon(value))).toThrow();
  }
});

test("catalog limits declared and streamed response sizes before parsing", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response("{}", {
          headers: { "content-length": String(21 * 1024 * 1024) },
        }),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array(20 * 1024 * 1024 + 1)),
      ),
  );
  await expect(loadNavigationLibrary()).rejects.toThrow("导航目录过大");
  await expect(loadNavigationLibrary()).rejects.toThrow("导航目录过大");
});

test("featured and full directory requests remain independent", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(async () => new Response(JSON.stringify(library())));
  vi.stubGlobal("fetch", fetcher);
  const featured = loadNavigationLibrary("featured");
  expect(loadNavigationLibrary("featured")).toBe(featured);
  const full = loadNavigationLibrary();
  expect(full).not.toBe(featured);
  await Promise.all([featured, full]);
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
    "/api/navigation?view=featured",
    "/api/navigation",
  ]);
});
