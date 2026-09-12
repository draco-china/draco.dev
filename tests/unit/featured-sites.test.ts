import { expect, test } from "vitest";
import { featuredSites } from "../../apps/navigation/src/featured";

test("supplies eighteen illustrated shortcuts balanced across four groups", () => {
  const sites = featuredSites([]);
  expect(sites).toHaveLength(18);
  for (const group of ["设计", "前端", "产品", "运营"]) {
    expect(
      sites.filter((site) => site.group === group).length,
    ).toBeGreaterThanOrEqual(4);
  }
  expect(
    sites.every((site) => site.iconUrl?.startsWith("/api/navigation?icon=")),
  ).toBe(true);
});
test("refreshes source data while retaining short names and offline icons", () => {
  const preset = featuredSites([])[0];
  const result = featuredSites([
    {
      ...preset,
      name: "来源长名称",
      iconDataUrl: undefined,
      description: "新版说明",
    },
  ]);
  expect(result[0]).toMatchObject({
    name: preset.name,
    iconUrl: preset.iconUrl,
    description: "新版说明",
  });
});
