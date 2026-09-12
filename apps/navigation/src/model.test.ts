import { expect, it } from "vitest";
import { presetSites } from "./catalog";

it("keeps existing preset identities and provides unique HTTPS catalog entries", () => {
  expect(presetSites.slice(0, 5).map((site) => site.id)).toEqual([
    "github",
    "mdn",
    "huggingface",
    "tools",
    "hn",
  ]);
  expect(presetSites).toHaveLength(29);
  expect(new Set(presetSites.map((site) => site.id)).size).toBe(
    presetSites.length,
  );
  expect(new Set(presetSites.map((site) => new URL(site.url).href)).size).toBe(
    presetSites.length,
  );
  for (const site of presetSites) {
    const url = new URL(site.url);
    expect(url.protocol).toBe("https:");
    expect(url.username + url.password).toBe("");
    expect(site.description.length).toBeGreaterThan(0);
  }
});
