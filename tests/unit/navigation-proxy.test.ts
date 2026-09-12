import { expect, test, vi } from "vitest";
import { onGet } from "../../apps/desktop/src/routes/api/navigation";

test("forwards the original same-origin request and service response", async () => {
  const request = new Request("https://draco.dev/api/navigation", {
    headers: { Origin: "https://draco.dev" },
  });
  const response = Response.json({ sites: [] });
  const fetch = vi.fn().mockResolvedValue(response);
  const send = vi.fn();
  await onGet({
    request,
    platform: { env: { NAVIGATION: { fetch } } },
    send,
  } as unknown as Parameters<typeof onGet>[0]);
  expect(fetch).toHaveBeenCalledWith(request);
  expect(send).toHaveBeenCalledWith(response);
});
test.each([
  undefined,
  {
    fetch: async () => {
      throw new Error("offline");
    },
  },
])("returns503 when the binding is unavailable", async (NAVIGATION) => {
  const send = vi.fn();
  await onGet({
    request: new Request("https://draco.dev/api/navigation"),
    platform: { env: { NAVIGATION } },
    send,
  } as unknown as Parameters<typeof onGet>[0]);
  const response = send.mock.calls[0]?.[0] as Response;
  expect(response.status).toBe(503);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ error: "目录暂时无法读取" });
});
