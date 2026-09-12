import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import { expect, it, vi } from "vitest";
import { needsSourceSync } from "./database";
import { fetchIcon, iconSourceUrl, syncImages } from "./images";

it("only fetches fixed-origin asset paths without redirects", async () => {
  expect(iconSourceUrl("/assets/logo.png")).toBe(
    "https://chuangzaoshi.com/assets/logo.png",
  );
  for (const url of [
    "https://evil.com/assets/a.png",
    "http://chuangzaoshi.com/assets/a.png",
    "/assets/../admin",
    "https://u:p@chuangzaoshi.com/assets/a.png",
  ])
    expect(iconSourceUrl(url)).toBeNull();
  const fetcher = vi.fn<typeof fetch>();
  await expect(
    fetchIcon("https://evil.com/assets/a.png", fetcher),
  ).rejects.toThrow("not allowed");
  expect(fetcher).not.toHaveBeenCalled();
});
it("uses actual raster format and rejects non-image content, SVG and oversized bodies", async () => {
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async () =>
        new Response(bytes, { headers: { "content-type": "image/png" } }),
    );
  const url = "https://chuangzaoshi.com/assets/logo.png";
  expect(await fetchIcon(url, fetcher)).toBe(
    "data:image/png;base64,iVBORw0KGgoBAgM=",
  );
  fetcher.mockResolvedValueOnce(
    new Response(bytes, { headers: { "content-type": "image/jpeg" } }),
  );
  expect(await fetchIcon(url, fetcher)).toMatch(/^data:image\/png;base64,/);
  expect(fetcher.mock.calls[0][1]?.redirect).toBe("manual");
  for (const response of [
    new Response(bytes, { headers: { "content-type": "text/html" } }),
    new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } }),
    new Response(new Uint8Array(262145), {
      headers: { "content-type": "image/png" },
    }),
  ]) {
    fetcher.mockResolvedValueOnce(response);
    await expect(fetchIcon(url, fetcher)).rejects.toThrow();
  }
});
it("limits each image pass and retains successful cached data on fetch failure", async () => {
  const statements: { sql: string; args: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      const statement = {
        sql,
        args: [] as unknown[],
        bind(...args: unknown[]) {
          this.args = args;
          return this;
        },
        all: async () => ({
          results: [{ url: "https://chuangzaoshi.com/assets/a.png" }],
        }),
      };
      statements.push(statement);
      return statement;
    },
    batch: vi.fn().mockResolvedValue([]),
  };
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
  expect(
    await syncImages(
      db as unknown as D1Database,
      {} as R2Bucket,
      fetcher,
      new Date("2026-09-12T00:00:00Z"),
    ),
  ).toEqual({ attempted: 1, saved: 0 });
  expect(statements[0].args).toEqual(["2026-09-11T00:00:00.000Z", 30]);
  expect(statements[1].sql).toContain(
    "COALESCE(excluded.icon_url,navigation_images.icon_url)",
  );
  expect(statements[1].args[1]).toBeNull();
});

it("refreshes HTML at the Beijing 04:00 boundary and leaves intervening passes for images", async () => {
  let updated_at = "2026-09-11T20:00:00.000Z";
  const db = {
    prepare: () => ({ bind: () => ({ first: async () => ({ updated_at }) }) }),
  };
  expect(
    await needsSourceSync(
      db as unknown as D1Database,
      new Date("2026-09-12T19:59:59Z"),
    ),
  ).toBe(false);
  expect(
    await needsSourceSync(
      db as unknown as D1Database,
      new Date("2026-09-12T20:00:00Z"),
    ),
  ).toBe(true);
  updated_at = "invalid";
  expect(
    await needsSourceSync(
      db as unknown as D1Database,
      new Date("2026-09-12T19:00:00Z"),
    ),
  ).toBe(true);
});

it("recognizes AVIF content served with a PNG extension and header", async () => {
  const bytes = new Uint8Array([
    0, 0, 0, 32, 102, 116, 121, 112, 97, 118, 105, 102, 0, 0, 0, 0,
  ]);
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(bytes, { headers: { "content-type": "image/png" } }),
    );
  expect(
    await fetchIcon("https://chuangzaoshi.com/assets/example.png", fetcher),
  ).toMatch(/^data:image\/avif;base64,/);
  expect(iconSourceUrl("/assets/")).toBeNull();
});

it("moves cached bytes to R2 before replacing the database value", async () => {
  const writes: unknown[][] = [];
  const db = {
    prepare: () => ({
      bind(...args: unknown[]) {
        writes.push(args);
        return {
          all: async () => ({
            results: [
              {
                url: "https://chuangzaoshi.com/assets/a.png",
                data_url: "data:image/png;base64,iVBORw0KGgoBAgM=",
              },
            ],
          }),
        };
      },
    }),
    batch: vi.fn().mockResolvedValue([]),
  };
  const put = vi.fn().mockResolvedValue({});
  const fetcher = vi.fn<typeof fetch>();
  expect(
    await syncImages(
      db as unknown as D1Database,
      { put } as unknown as R2Bucket,
      fetcher,
    ),
  ).toEqual({ attempted: 1, saved: 1 });
  expect(fetcher).not.toHaveBeenCalled();
  expect(put.mock.calls[0][0]).toMatch(/^[a-f0-9]{64}$/);
  expect(writes[1][1]).toBe(`/api/navigation?icon=${put.mock.calls[0][0]}`);
  put.mockRejectedValueOnce(new Error("R2 unavailable"));
  expect(
    await syncImages(
      db as unknown as D1Database,
      { put } as unknown as R2Bucket,
      fetcher,
    ),
  ).toEqual({ attempted: 1, saved: 0 });
  expect(writes[3][1]).toBeNull();
});
