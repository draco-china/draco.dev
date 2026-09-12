import { render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { StandaloneApp } from "@workspace/app-sdk/standalone";
import Navigation from "@workspace/navigation";
import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
let container: HTMLDivElement;
let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  container?.remove();
  vi.unstubAllGlobals();
});
async function mount() {
  container = document.createElement("div");
  document.body.append(container);
  cleanup = (
    await render(
      container,
      <StandaloneApp app={Navigation} appId="navigation" title="应用导航" />,
    )
  ).cleanup;
}
for (const width of [1100, 390]) {
  test(`navigation resets only the results scroll when filters change at ${width}px`, async () => {
    const sites = ["websites", "downloads"].flatMap((section) =>
      ["设计", "前端"].flatMap((group) =>
        Array.from({ length: 80 }, (_, index) => ({
          id: `${section}-${group}-${index}`,
          name: `${group}资源 ${index}`,
          url: `https://example.org/${section}/${group}/${index}`,
          category: index % 2 ? "文档" : "推荐",
          group,
          section,
          description: "官方入口",
          icon: "R",
          tags: [],
        })),
      ),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () =>
        Response.json({
          sites,
          categories: ["推荐", "文档"],
          updatedAt: null,
        }),
      ),
    );
    await page.viewport(width, 760);
    await mount();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("160 个站点");
    const content = container.querySelector(
      "[data-navigation-scroll]",
    ) as HTMLElement;
    const scrollDown = () => {
      content.scrollTop = 500;
      expect(content.scrollTop).toBeGreaterThan(0);
    };
    scrollDown();
    if (width >= 760) {
      await page.getByRole("button", { name: "前端", exact: true }).click();
    } else {
      await page.getByRole("combobox", { name: "导航大类" }).click();
      await page.getByRole("option", { name: "前端", exact: true }).click();
    }
    await expect
      .element(page.getByRole("heading", { name: "前端", exact: true }))
      .toBeVisible();
    await expect.poll(() => content.scrollTop).toBe(0);
    scrollDown();
    await page.getByRole("combobox", { name: "网站分类" }).click();
    await page.getByRole("option", { name: "文档", exact: true }).click();
    await expect.poll(() => content.scrollTop).toBe(0);
    scrollDown();
    await page.getByRole("button", { name: "下载", exact: true }).click();
    await expect.poll(() => content.scrollTop).toBe(0);
    scrollDown();
    await page.getByRole("textbox", { name: "搜索网站" }).fill("资源");
    await expect.poll(() => content.scrollTop).toBe(0);
    expect(document.documentElement.scrollTop).toBe(0);
  });
}
test("read-only catalog retries, filters major and fine groups and opens downloads externally", async () => {
  const groups = [
    "设计",
    "前端",
    "产品",
    "运营",
    "极客世界",
    "3D打印",
    "自然艺术",
    "工作兼职",
  ];
  const iconUrl = `/api/navigation?icon=${"a".repeat(64)}`;
  const sites = groups.map((group, index) => ({
    ...(index === 1 ? { iconUrl } : {}),
    id: `remote-${index}`,
    name: `${group}资源`,
    url: `https://example.org/${index}`,
    category: `${group}细类`,
    group,
    section: "websites",
    description: "官方入口",
    icon: "R",
    tags: [],
  }));
  sites.push({
    ...sites[0],
    id: "download",
    name: "设计软件下载",
    url: "https://example.org/download",
    category: "设计软件",
    section: "downloads",
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify({
              sites,
              categories: sites.map((site) => site.category),
              updatedAt: "2026-09-12T00:00:00Z",
            }),
          ),
      ),
  );
  await page.viewport(1100, 760);
  await mount();
  await page.getByRole("button", { name: "刷新目录", exact: true }).click();
  await expect
    .element(
      page.getByRole("link", { name: "R 设计资源 官方入口", exact: true }),
    )
    .toBeVisible();
  expect(container.querySelector("img")?.getAttribute("src")).toBe(iconUrl);
  expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
  for (const group of groups)
    await expect
      .element(page.getByRole("button", { name: group, exact: true }))
      .toBeVisible();
  await page.getByRole("button", { name: "前端", exact: true }).click();
  await page.getByRole("combobox", { name: "网站分类" }).click();
  await page.getByRole("option", { name: "前端细类", exact: true }).click();
  await expect.poll(() => container.querySelectorAll("a").length).toBe(1);
  await page.getByRole("button", { name: "下载", exact: true }).click();
  const download = page.getByRole("link", {
    name: "R 设计软件下载 官方入口",
    exact: true,
  });
  await expect.element(download).toBeVisible();
  await expect.element(download).toHaveAttribute("target", "_blank");
  await expect.element(download).toHaveAttribute("rel", "noopener noreferrer");
  await expect
    .element(download)
    .toHaveAttribute("href", "https://example.org/download");
  await page.getByRole("button", { name: "网站", exact: true }).click();
  expect(container.textContent).not.toContain("上移");
  expect(container.textContent).not.toContain("收藏");
  for (const label of [
    "添加网站",
    "编辑",
    "删除",
    "当前浏览器",
    "导出数据",
    "导入数据",
    "恢复默认",
  ])
    expect(container.textContent).not.toContain(label);
  expect(container.querySelector("form")).toBeNull();
});

test("navigation keeps scrolling inside content and adapts side navigation to touch width", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("offline fixture")),
  );
  await page.viewport(1100, 760);
  await mount();
  await expect
    .element(page.getByRole("link", { name: /GitHub/ }).first())
    .toBeVisible();
  await expect
    .element(page.getByRole("navigation", { name: "导航分类" }))
    .toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(1100);
  expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(760);
  await page.screenshot({ path: "../../tmp/navigation-redesign-desktop.png" });
  await page.viewport(390, 844);
  await expect
    .element(page.getByRole("combobox", { name: "导航大类" }))
    .toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(844);
  const content = container.querySelector(
    "[data-navigation-scroll]",
  ) as HTMLElement;
  expect(content.scrollHeight).toBeGreaterThan(content.clientHeight);
  await page.screenshot({ path: "../../tmp/navigation-redesign-mobile.png" });
});
