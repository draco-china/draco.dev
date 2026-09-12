import { $, render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import type { AppHost } from "@workspace/app-sdk";
import { afterEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { BrowserApp } from "../../apps/desktop/src/features/browser/browser-app";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
let container: HTMLDivElement;
let cleanup: (() => void) | undefined;
const host: AppHost = {
  mode: "standalone",
  appearance: { theme: "light", accent: "blue", reducedMotion: true },
  visible: true,
  path: "/",
  openUrl$: $(() => {}),
  setTitle$: $(() => {}),
  navigate$: $((path: string) => {
    document.body.dataset.browserPath = path;
  }),
};
afterEach(() => {
  vi.useRealTimers();
  cleanup?.();
  container?.remove();
  delete document.body.dataset.browserPath;
});
async function mount() {
  container = document.createElement("div");
  container.style.cssText = "height:600px;width:800px";
  document.body.append(container);
  cleanup = (
    await render(
      container,
      <BrowserApp host={host}>
        <p>Start fixture</p>
      </BrowserApp>,
    )
  ).cleanup;
}
async function navigate(url: string) {
  await page.getByLabelText("网页地址或搜索").fill(url);
  await userEvent.keyboard("{Enter}");
  await expect
    .poll(() => container.querySelector("iframe")?.getAttribute("src"))
    .toBe(url);
}
test("browser host history, refresh and external link follow the selected entry", async () => {
  await mount();
  const first = "https://example.invalid/first",
    second = "https://example.invalid/second";
  await navigate(first);
  await navigate(second);
  await page.getByRole("button", { name: "后退", exact: true }).click();
  await expect
    .poll(() => container.querySelector("iframe")?.getAttribute("src"))
    .toBe(first);
  expect(document.body.dataset.browserPath).toBe(
    `/?url=${encodeURIComponent(first)}`,
  );
  await page.getByRole("button", { name: "前进", exact: true }).click();
  await expect
    .poll(() => container.querySelector("iframe")?.getAttribute("src"))
    .toBe(second);
  const old = container.querySelector("iframe");
  await page.getByRole("button", { name: "刷新网页" }).click();
  await expect.poll(() => container.querySelector("iframe") !== old).toBe(true);
  const external = container.querySelector<HTMLAnchorElement>(
    'a[aria-label="在浏览器中打开"]',
  );
  expect(external?.href).toBe(second);
  expect(external?.target).toBe("_blank");
  expect(external?.rel).toContain("noopener");
  await page.getByRole("button", { name: "浏览器起始页" }).click();
  await expect.element(page.getByText("Start fixture")).toBeVisible();
  await page.getByRole("button", { name: "后退", exact: true }).click();
  await expect
    .poll(() => container.querySelector("iframe")?.getAttribute("src"))
    .toBe(second);
});
test("browser delayed feedback offers retry without discarding address", async () => {
  await mount();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  await navigate("https://example.invalid/slow");
  await vi.advanceTimersByTimeAsync(10001);
  await expect
    .element(page.getByText("页面尚未显示？可以重试或在浏览器中打开。"))
    .toBeVisible();
  const old = container.querySelector("iframe");
  await page.getByRole("button", { name: "重试", exact: true }).click();
  await expect.poll(() => container.querySelector("iframe") !== old).toBe(true);
  expect(container.querySelector("iframe")?.getAttribute("src")).toBe(
    "https://example.invalid/slow",
  );
  await expect
    .poll(() => container.textContent?.includes("页面尚未显示？"))
    .toBe(false);
});
