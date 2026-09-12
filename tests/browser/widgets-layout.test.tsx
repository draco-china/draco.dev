import { render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { attachPlayer, readPlayer } from "@workspace/music/player-bridge";
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
let player: ReturnType<typeof attachPlayer> | undefined;
let seeks: number[] = [];
let toggles = 0;
afterEach(() => {
  cleanup?.();
  vi.restoreAllMocks();
  player?.dispose();
  host?.remove();
  localStorage.clear();
  history.replaceState(null, "", location.pathname);
});
async function mount(width: number, height: number, touch = false) {
  if (touch) {
    const original = window.matchMedia.bind(window);
    vi.spyOn(window, "matchMedia").mockImplementation((query) => {
      const media = original(query);
      if (query === "(min-width:1024px) and (hover:hover) and (pointer:fine)")
        Object.defineProperty(media, "matches", { value: false });
      return media;
    });
  }
  await page.viewport(width, height);
  history.replaceState(null, "", location.pathname);
  localStorage.setItem("draco.visited", "1");
  seeks = [];
  toggles = 0;
  host = document.createElement("div");
  document.body.append(host);
  cleanup = (
    await render(host, <Desktop initial={structuredClone(defaultSite)} />)
  ).cleanup;
  await expect.element(page.getByLabelText("搜索关键词")).toBeVisible();
  await expect.poll(() => readPlayer().connected).toBe(true);
  player = attachPlayer({
    toggle: async () => {
      toggles++;
    },
    previous: async () => {},
    next: async () => {},
    seek: async (seconds) => {
      seeks.push(seconds);
    },
  });
  player.update({
    title: "Fixture song",
    artist: "Fixture artist",
    cover: "",
    playing: true,
    progress: 30,
    duration: 180,
  });
  const canvas = host.querySelector("[data-desktop-home]") as HTMLElement;
  await expect
    .poll(() =>
      canvas
        .getAnimations()
        .some((animation) => animation.playState === "running"),
    )
    .toBe(false);
}
for (const [width, height, touch] of [
  [1440, 900],
  [390, 844],
  [320, 568],
  [360, 640],
  [360, 320],
  [844, 390],
  [812, 375],
  [834, 1194, true],
  [1194, 834, true],
] as const) {
  test(`music widget and shortcuts remain accessible at ${width}x${height}`, async () => {
    await mount(width, height, touch);
    const widgets = host.querySelectorAll<HTMLElement>("[data-widget-page]");
    expect(widgets).toHaveLength(1);
    const rect = widgets[0].getBoundingClientRect();
    const dock = host.querySelector(
      'nav[aria-label="应用程序"]',
    ) as HTMLElement;
    const shortcuts = host.querySelector(
      "[data-home-shortcuts]",
    ) as HTMLElement;
    expect(rect.height).toBeGreaterThan(60);
    expect(rect.bottom).toBeLessThanOrEqual(dock.getBoundingClientRect().top);
    if (host.querySelector('[data-home-touch="true"]')) {
      const search = host.querySelector("[data-home-search]") as HTMLElement;
      expect(rect.bottom).toBeLessThanOrEqual(
        search.getBoundingClientRect().top,
      );
      expect(shortcuts.querySelectorAll("a")).toHaveLength(12);
      expect(shortcuts.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        dock.getBoundingClientRect().top,
      );
    }
    await expect
      .element(page.getByLabelText("已播放时间"))
      .toHaveTextContent("00:30");
    const widget = widgets[0].firstElementChild as HTMLElement;
    const title = widget.querySelector("p") as HTMLElement;
    const timer = widget.querySelector('[role="timer"]') as HTMLElement;
    const controls = widget.querySelectorAll<HTMLButtonElement>(
      "button:not([data-widget-open])",
    );
    for (const control of controls) {
      const button = control.getBoundingClientRect();
      expect(button.left).toBeGreaterThanOrEqual(rect.left);
      expect(button.right).toBeLessThanOrEqual(rect.right);
      expect(button.bottom).toBeLessThanOrEqual(rect.bottom);
      if (rect.width < 224) {
        expect(button.top).toBeGreaterThanOrEqual(
          timer.getBoundingClientRect().bottom,
        );
        expect(title.getBoundingClientRect().width).toBeGreaterThanOrEqual(60);
      }
    }
    if (rect.width < 224) {
      const middle = controls[1].getBoundingClientRect();
      expect(
        Math.abs(middle.left + middle.width / 2 - (rect.left + rect.width / 2)),
      ).toBeLessThanOrEqual(1);
      const content = widget.lastElementChild?.getBoundingClientRect();
      expect(content).toBeDefined();
      if (content)
        expect(
          Math.abs(
            content.top + content.height / 2 - (rect.top + rect.height / 2),
          ),
        ).toBeLessThanOrEqual(1);
    }
    await page.getByRole("button", { name: "暂停音乐", exact: true }).click();
    await expect.poll(() => toggles).toBe(1);
    expect(new URL(location.href).searchParams.get("app")).toBeNull();
    expect(host.querySelector('[aria-label="音乐小组件播放进度"]')).toBeNull();
    expect(document.documentElement.scrollTop).toBe(0);
    expect(host.querySelector("[data-home-pages]")).toBeNull();
    if ([390, 834, 1194].includes(width))
      await page.screenshot({
        path: `../../tmp/home-widgets-${width}x${height}.png`,
      });
  });
}
