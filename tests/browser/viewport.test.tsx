import { render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
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
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-segmented");
  document.documentElement.removeAttribute("data-foldable");
  localStorage.clear();
});
test("emulated segments keep desktop and apps clear of the hinge through rotation", async () => {
  await page.viewport(1100, 800);
  const viewport = {
    segments: [
      { left: 0, top: 0, width: 530, height: 800 },
      { left: 570, top: 0, width: 530, height: 800 },
    ],
  };
  vi.stubGlobal("viewport", viewport);
  localStorage.setItem("draco.visited", "1");
  host = document.createElement("div");
  document.body.append(host);
  cleanup = (
    await render(host, <Desktop initial={structuredClone(defaultSite)} />)
  ).cleanup;
  await page.getByLabelText("搜索关键词").fill("折叠状态保留");
  const bounds = (selector: string) => {
    const rect = host.querySelector(selector)?.getBoundingClientRect();
    return rect
      ? {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        }
      : null;
  };
  await expect.poll(() => bounds("[data-desktop-home]")?.right).toBe(530);
  expect(bounds('nav[aria-label="应用程序"]')?.right).toBeLessThanOrEqual(530);
  await page.getByRole("button", { name: "设置", exact: true }).last().click();
  await expect
    .poll(() =>
      host
        .querySelector('[data-window="settings"]')
        ?.getAnimations()
        .some((animation) => animation.playState === "running"),
    )
    .toBe(false);
  await expect.poll(() => bounds('[data-window="settings"]')?.right).toBe(518);
  const originalWindow = host.querySelector('[data-window="settings"]');
  viewport.segments = [
    { left: 0, top: 0, width: 800, height: 530 },
    { left: 0, top: 570, width: 800, height: 530 },
  ];
  await page.viewport(800, 1100);
  await expect.poll(() => bounds('[data-window="settings"]')?.bottom).toBe(518);
  expect(host.querySelector('[data-window="settings"]')).toBe(originalWindow);
  expect(
    (host.querySelector('[aria-label="搜索关键词"]') as HTMLInputElement).value,
  ).toBe("折叠状态保留");
  viewport.segments = [
    { left: 0, top: 0, width: 400, height: 1100 },
    { left: 400, top: 0, width: 400, height: 1100 },
  ];
  window.dispatchEvent(new Event("resize"));
  await expect
    .poll(() => document.documentElement.hasAttribute("data-segmented"))
    .toBe(false);
  expect(document.documentElement.hasAttribute("data-foldable")).toBe(true);
  await expect
    .poll(
      () =>
        host.querySelector('[data-window="settings"]')?.getBoundingClientRect()
          .width,
    )
    .toBeGreaterThan(400);
  expect(host.querySelector('[data-window="settings"]')).toBe(originalWindow);
  viewport.segments = [{ left: 0, top: 0, width: 800, height: 1100 }];
  window.dispatchEvent(new Event("resize"));
  await expect
    .poll(() => document.documentElement.hasAttribute("data-segmented"))
    .toBe(false);
  expect(host.querySelector('[data-window="settings"]')).toBe(originalWindow);
  expect(document.documentElement.hasAttribute("data-foldable")).toBe(false);
});
