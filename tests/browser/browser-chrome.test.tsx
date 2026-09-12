import { render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { afterEach, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { Desktop } from "../../apps/desktop/src/features/desktop/desktop";
import { defaultSite } from "../../apps/desktop/src/features/site/model";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
let host: HTMLDivElement;
let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  host?.remove();
  localStorage.clear();
  history.replaceState(null, "", location.pathname);
});
async function mount(width: number, height: number) {
  await page.viewport(width, height);
  localStorage.clear();
  localStorage.setItem("draco.visited", "1");
  history.replaceState(null, "", location.pathname);
  host = document.createElement("div");
  document.body.append(host);
  cleanup = (
    await render(host, <Desktop initial={structuredClone(defaultSite)} />)
  ).cleanup;
  await page
    .getByRole("button", { name: "浏览器", exact: true })
    .last()
    .click();
  await expect.element(page.getByLabelText("网页地址或搜索")).toBeVisible();
}
function rectangle(selector: string) {
  const element = host.querySelector(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element.getBoundingClientRect();
}
test("desktop browser integrates traffic lights without overlapping navigation and encodes search", async () => {
  await mount(1440, 1000);
  const controls = rectangle('[data-window="browser"] [data-window-bar]');
  const back = rectangle('[data-browser-toolbar] button[aria-label="后退"]');
  const toolbar = rectangle("[data-browser-toolbar]");
  expect(back.left).toBeGreaterThanOrEqual(controls.right - 1);
  expect(
    Math.abs(back.top + back.height / 2 - (toolbar.top + toolbar.height / 2)),
  ).toBeLessThan(3);
  const query = "中文 & x=1 +?#";
  await page.getByLabelText("网页地址或搜索").fill(query);
  await userEvent.keyboard("{Enter}");
  await expect
    .poll(() =>
      host.querySelector('iframe[title="浏览网页"]')?.getAttribute("src"),
    )
    .toBe(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
  await page.getByRole("button", { name: "浏览器起始页" }).click();
  await expect
    .poll(() => host.querySelector('iframe[title="浏览网页"]'))
    .toBeNull();
  await expect
    .element(
      page.getByRole("heading", { name: "探索网站", exact: true, level: 1 }),
    )
    .toBeVisible();
  await expect.element(page.getByLabelText("网页地址或搜索")).toHaveValue("");
});
test("phone browser places toolbar at bottom without horizontal overflow and returns to start page", async () => {
  await mount(390, 844);
  const toolbar = rectangle("[data-browser-toolbar]");
  const frame = rectangle('[data-window="browser"]');
  expect(toolbar.top).toBeGreaterThan(frame.top + frame.height / 2);
  expect(toolbar.bottom).toBeLessThanOrEqual(frame.bottom + 1);
  expect(toolbar.left).toBeGreaterThanOrEqual(frame.left - 1);
  expect(toolbar.right).toBeLessThanOrEqual(frame.right + 1);
  await page.getByLabelText("网页地址或搜索").fill("https://tool.draco.dev/");
  await userEvent.keyboard("{Enter}");
  await expect
    .poll(() =>
      host.querySelector('iframe[title="浏览网页"]')?.getAttribute("src"),
    )
    .toBe("https://tool.draco.dev/");
  const fullToolbar = host.querySelector<HTMLElement>("[data-browser-toolbar]");
  expect(fullToolbar?.scrollWidth).toBeLessThanOrEqual(
    (fullToolbar?.clientWidth ?? 0) + 1,
  );
  await page.getByRole("button", { name: "浏览器起始页" }).click();
  await expect
    .element(
      page.getByRole("heading", { name: "探索网站", exact: true, level: 1 }),
    )
    .toBeVisible();
});
