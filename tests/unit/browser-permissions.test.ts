import { expect, test } from "vitest";
import { browserPermissions } from "../../apps/desktop/src/features/browser/permissions";

test("registered iframe permissions apply only to the exact site origin", () => {
  const sites = [
    {
      url: "https://tool.draco.dev",
      sandbox: "allow-scripts",
      allow: "clipboard-write",
    },
  ];
  expect(
    browserPermissions("https://tool.draco.dev/tools/hash", sites),
  ).toEqual({ sandbox: "allow-scripts", allow: "clipboard-write" });
  for (const url of [
    "https://tool.draco.dev.example.com",
    "https://other.test",
    "https://tool.draco.dev:444",
    "",
  ]) {
    expect(browserPermissions(url, sites).allow).toBeUndefined();
  }
});
