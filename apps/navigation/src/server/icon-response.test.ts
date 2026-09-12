import { expect, it, vi } from "vitest";
import type { NavigationEnv } from "./env";
import { iconResponse } from "./icon-response";

it("serves immutable R2 icons and handles conditional requests", async () => {
  const key = "a".repeat(64);
  const get = vi.fn().mockResolvedValue({
    httpEtag: '"etag"',
    writeHttpMetadata: (headers: Headers) =>
      headers.set("Content-Type", "image/png"),
    arrayBuffer: async () => new Uint8Array([1, 2]).buffer,
  });
  const env = { ICONS: { get } } as unknown as NavigationEnv;
  const response = await iconResponse(
    new Request("https://draco.dev/api/navigation"),
    env,
    key,
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("immutable");
  expect(response.headers.get("Content-Type")).toBe("image/png");
  expect((await response.arrayBuffer()).byteLength).toBe(2);
  const cached = await iconResponse(
    new Request("https://draco.dev/api/navigation", {
      headers: { "If-None-Match": '"etag"' },
    }),
    env,
    key,
  );
  expect(cached.status).toBe(304);
  expect(
    (await iconResponse(new Request("https://draco.dev"), env, "../private"))
      .status,
  ).toBe(404);
  expect(get).toHaveBeenCalledTimes(2);
});
