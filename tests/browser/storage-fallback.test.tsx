import { render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { StandaloneApp } from "@workspace/app-sdk/standalone";
import Music from "@workspace/music";
import Navigation from "@workspace/navigation";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";
import { Desktop } from "../../apps/desktop/src/features/desktop/desktop";
import { defaultSite } from "../../apps/desktop/src/features/site/model";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
const originalLocal = Object.getOwnPropertyDescriptor(window, "localStorage");
const originalIdb = Object.getOwnPropertyDescriptor(window, "indexedDB");
let container: HTMLDivElement;
let cleanup: (() => void) | undefined;
function denyStorage() {
  for (const name of ["localStorage", "indexedDB"]) {
    Object.defineProperty(window, name, {
      configurable: true,
      get() {
        throw new DOMException("Storage denied", "SecurityError");
      },
    });
  }
  container = document.createElement("div");
  document.body.append(container);
}
afterEach(() => {
  cleanup?.();
  container?.remove();
  if (originalLocal)
    Object.defineProperty(window, "localStorage", originalLocal);
  if (originalIdb) Object.defineProperty(window, "indexedDB", originalIdb);
  history.replaceState(null, "", location.pathname);
});

test("read-only navigation remains usable when browser storage is denied", async () => {
  denyStorage();
  cleanup = (
    await render(
      container,
      <StandaloneApp app={Navigation} appId="navigation" title="导航" />,
    )
  ).cleanup;
  await page.getByLabelText("搜索网站").fill("GitHub");
  await expect
    .element(page.getByRole("link").filter({ hasText: "GitHub" }).first())
    .toHaveAttribute("target", "_blank");
  expect(container.textContent).not.toContain("添加网站");
});

test("music controls remain usable with an explicit session-only notice", async () => {
  denyStorage();
  cleanup = (
    await render(
      container,
      <StandaloneApp app={Music} appId="music" title="音乐" />,
    )
  ).cleanup;
  await expect
    .element(page.getByText("浏览器存储暂时不可用，本次修改保留在当前会话"))
    .toBeVisible();
  await page.getByLabelText("搜索歌曲").fill("会话内搜索");
  await page.getByRole("button", { name: "展开播放器" }).click();
  await expect
    .element(page.getByRole("slider", { name: "音量" }))
    .toBeVisible();
  const slider = page
    .getByRole("slider", { name: "音量" })
    .element() as HTMLInputElement;
  slider.value = "0.35";
  slider.dispatchEvent(new Event("input", { bubbles: true }));
  slider.dispatchEvent(new Event("change", { bubbles: true }));
  await expect
    .poll(() => container.querySelector("audio")?.volume)
    .toBeCloseTo(0.35);
  await expect
    .element(page.getByLabelText("搜索歌曲"))
    .toHaveValue("会话内搜索");
});

test("desktop appearance changes survive failed localStorage writes for the current session", async () => {
  await page.viewport(1440, 1000);
  denyStorage();
  cleanup = (
    await render(container, <Desktop initial={structuredClone(defaultSite)} />)
  ).cleanup;
  await expect.element(page.getByLabelText("搜索关键词")).toBeVisible();
  await page.getByRole("button", { name: "设置", exact: true }).last().click();
  await page.getByRole("button", { name: "深色", exact: true }).click();
  await expect.poll(() => document.documentElement.dataset.theme).toBe("dark");
  await expect.element(page.getByText("设置已在当前会话生效")).toBeVisible();
  await page.getByRole("button", { name: "浅色", exact: true }).click();
  await expect.poll(() => document.documentElement.dataset.theme).toBe("light");
});
