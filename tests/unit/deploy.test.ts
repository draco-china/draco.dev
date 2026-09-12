import { expect, test, vi } from "vitest";
import {
  deploymentEnvironment,
  deployWorkers,
  ensureDatabase,
} from "../../scripts/deploy";

test("reuses a named database without creating another", async () => {
  const run = vi
    .fn()
    .mockResolvedValue('[{"name":"navigation","uuid":"existing"}]');
  expect(await ensureDatabase("navigation", run)).toBe("existing");
  expect(run).toHaveBeenCalledTimes(1);
});
test("creates missing database and resolves its ID", async () => {
  const run = vi
    .fn()
    .mockResolvedValueOnce("[]")
    .mockResolvedValueOnce("")
    .mockResolvedValueOnce('[{"name":"navigation","uuid":"created"}]');
  expect(await ensureDatabase("navigation", run)).toBe("created");
  expect(run).toHaveBeenNthCalledWith(2, [
    "d1",
    "create",
    "navigation",
    "--update-config=false",
  ]);
});
test("reuses a database created concurrently", async () => {
  const run = vi
    .fn()
    .mockResolvedValueOnce("[]")
    .mockRejectedValueOnce(new Error("already exists"))
    .mockResolvedValueOnce('[{"name":"navigation","uuid":"concurrent"}]');
  expect(await ensureDatabase("navigation", run)).toBe("concurrent");
});
test("creation failure stops deployment preparation", async () => {
  const run = vi
    .fn()
    .mockResolvedValueOnce("[]")
    .mockRejectedValueOnce(new Error("denied"))
    .mockResolvedValueOnce("[]");
  await expect(ensureDatabase("navigation", run)).rejects.toThrow("denied");
});

test("migrates navigation and deploys it before the desktop", async () => {
  const run = vi.fn().mockResolvedValue("");
  await deployWorkers("navigation.json", "main.json", run);
  expect(run.mock.calls.map(([args]) => args)).toEqual([
    [
      "d1",
      "migrations",
      "apply",
      "DB",
      "--remote",
      "--config",
      "navigation.json",
    ],
    ["deploy", "--config", "navigation.json"],
    ["deploy", "--config", "main.json"],
  ]);
});
test.each([1, 2])(
  "stops publication after prerequisite %i fails",
  async (step) => {
    const run = vi.fn().mockResolvedValue("");
    run.mockImplementation(async () => {
      if (run.mock.calls.length === step) throw new Error("deployment failed");
      return "";
    });
    await expect(
      deployWorkers("navigation.json", "main.json", run),
    ).rejects.toThrow("deployment failed");
    expect(run).toHaveBeenCalledTimes(step);
  },
);

test("child deployment retains credentials and account but uses its own Worker identity", () => {
  const source = {
    CLOUDFLARE_API_TOKEN: "test-token",
    CLOUDFLARE_ACCOUNT_ID: "account",
    WRANGLER_CI_OVERRIDE_NAME: "draco-dev",
    WRANGLER_CI_MATCH_TAG: "main-tag",
  };
  const child = deploymentEnvironment(
    source,
    ["deploy", "--config", "navigation.json"],
    "wrangler.jsonc",
  );
  expect(child.CLOUDFLARE_ACCOUNT_ID).toBe("account");
  expect(child.CLOUDFLARE_API_TOKEN).toBe("test-token");
  expect(child.WRANGLER_CI_OVERRIDE_NAME).toBeUndefined();
  expect(child.WRANGLER_CI_MATCH_TAG).toBeUndefined();
  expect(
    deploymentEnvironment(
      source,
      ["deploy", "--config", "wrangler.jsonc"],
      "wrangler.jsonc",
    ).WRANGLER_CI_MATCH_TAG,
  ).toBe("main-tag");
  expect(source.WRANGLER_CI_OVERRIDE_NAME).toBe("draco-dev");
});
