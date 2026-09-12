import { render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { afterEach, expect, test } from "vitest";
import { commands, page } from "vitest/browser";
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
for (const [width, height] of [
  [320, 568],
  [390, 844],
  [844, 390],
  [360, 320],
  [1440, 900],
  [1262, 609],
  [1280, 720],
]) {
  test(`desktop canvas stays fixed with reachable controls at ${width}x${height}`, async () => {
    await page.viewport(width, height);
    history.replaceState(null, "", location.pathname);
    localStorage.setItem("draco.visited", "1");
    host = document.createElement("div");
    document.body.append(host);
    cleanup = (
      await render(host, <Desktop initial={structuredClone(defaultSite)} />)
    ).cleanup;
    await expect.element(page.getByLabelText("搜索关键词")).toBeVisible();
    const home = host.querySelector("[data-desktop-home]") as HTMLElement;
    await expect
      .poll(() => home.getAnimations().some((a) => a.playState === "running"))
      .toBe(false);
    const controls = [
      ...home.querySelectorAll<HTMLElement>("[data-home-search]"),
    ];
    const dock = host.querySelector(
      'nav[aria-label="应用程序"]',
    ) as HTMLElement;
    expect(home.querySelectorAll("[data-app]")).toHaveLength(0);
    const dockIcons = [
      ...dock.querySelectorAll<HTMLElement>(
        '[data-dock]:not([data-dock="home"])',
      ),
    ];
    expect(dockIcons).toHaveLength(7);
    for (const icon of dockIcons) {
      const rect = icon.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(width);
      expect(rect.bottom).toBeLessThanOrEqual(height);
    }
    for (const control of controls) {
      const rect = control.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(width);
      expect(rect.top).toBeGreaterThanOrEqual(0);
      expect(rect.bottom).toBeLessThanOrEqual(dock.getBoundingClientRect().top);
    }
    if (width >= 1108) {
      for (const selector of ["[data-home-shortcuts]", "[data-home-widgets]"]) {
        const region = home.querySelector(selector) as HTMLElement;
        const rect = region.getBoundingClientRect();
        expect(rect.bottom).toBeLessThanOrEqual(
          dock.getBoundingClientRect().top - 24,
        );
        expect(rect.left).toBeGreaterThanOrEqual(0);
        expect(rect.right).toBeLessThanOrEqual(width);
      }
      const widgets = home.querySelector("[data-home-widgets]") as HTMLElement;
      const shortcuts = home.querySelector(
        "[data-home-shortcuts]",
      ) as HTMLElement;
      expect(widgets.getBoundingClientRect().left).toBeGreaterThanOrEqual(
        shortcuts.getBoundingClientRect().right + 16,
      );
    }
    home.scrollTop = 300;
    document.body.scrollTop = 300;
    document.documentElement.scrollTop = 300;
    await commands.homeWheel();
    expect(home.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
    expect(document.documentElement.scrollTop).toBe(0);
    await page.getByLabelText("搜索关键词").fill("固定桌面");
    const settings = dock.querySelector(
      '[data-dock="settings"]',
    ) as HTMLButtonElement;
    let clicked = false;
    let clickTarget: EventTarget | null = null;
    settings.addEventListener(
      "click",
      (event) => {
        clicked = true;
        clickTarget = event.target;
      },
      { once: true },
    );
    await page
      .getByRole("button", { name: "设置", exact: true })
      .last()
      .click();
    expect(clicked).toBe(true);
    expect(clickTarget).toBe(settings);
    await expect
      .poll(() => new URL(location.href).searchParams.get("app"))
      .toBe("settings");
    await expect
      .element(page.getByRole("button", { name: "深色", exact: true }))
      .toBeVisible();
    const body = host.querySelector("[data-window-body]") as HTMLElement;
    if (body.scrollHeight > body.clientHeight) {
      body.scrollTop = 100;
      expect(body.scrollTop).toBeGreaterThan(0);
    }
  });
}
