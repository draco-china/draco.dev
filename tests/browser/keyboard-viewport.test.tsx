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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const name of [
    "--safe-left",
    "--safe-right",
    "--safe-top",
    "--safe-bottom",
    "--visual-height",
  ])
    document.documentElement.style.removeProperty(name);
  localStorage.clear();
});
async function mount() {
  history.replaceState(null, "", location.pathname);
  localStorage.setItem("draco.visited", "1");
  host = document.createElement("div");
  document.body.append(host);
  cleanup = (
    await render(host, <Desktop initial={structuredClone(defaultSite)} />)
  ).cleanup;
  await page.getByRole("button", { name: "设置", exact: true }).last().click();
  await expect
    .element(page.getByRole("button", { name: "深色", exact: true }))
    .toBeVisible();
}
test("wide touch panel shrinks for the emulated keyboard while preserving its scroll container", async () => {
  await page.viewport(820, 1180);
  const viewport = Object.assign(new EventTarget(), { height: 1180 });
  vi.stubGlobal("visualViewport", viewport);
  await mount();
  const frame = host.querySelector('[data-window="settings"]') as HTMLElement;
  const body = frame.querySelector("[data-window-body]") as HTMLElement;
  body.scrollTop = 100;
  const scrollTop = body.scrollTop;
  viewport.height = 620;
  viewport.dispatchEvent(new Event("resize"));
  await expect
    .poll(() =>
      document.documentElement.style.getPropertyValue("--visual-height"),
    )
    .toBe("620px");
  await expect
    .poll(
      () =>
        frame
          .getAnimations()
          .some((animation) => animation.playState === "running"),
      { timeout: 5000 },
    )
    .toBe(false);
  await expect
    .poll(() => frame.getBoundingClientRect().bottom)
    .toBeLessThanOrEqual(608);
  expect(frame.getBoundingClientRect().height).toBeGreaterThan(400);
  expect(frame.querySelector("[data-window-body]")).toBe(body);
  expect(body.scrollTop).toBe(scrollTop);
});
test("landscape fullscreen content respects emulated left right and bottom safe areas", async () => {
  await page.viewport(844, 390);
  document.documentElement.style.setProperty("--safe-left", "44px");
  document.documentElement.style.setProperty("--safe-right", "44px");
  document.documentElement.style.setProperty("--safe-bottom", "21px");
  await mount();
  const frame = host.querySelector('[data-window="settings"]') as HTMLElement;
  await expect.poll(() => frame.getBoundingClientRect().width).toBe(844);
  const bar = frame.querySelector("[data-window-bar]") as HTMLElement;
  expect(bar.getBoundingClientRect().left).toBe(44);
  expect(bar.getBoundingClientRect().right).toBe(800);
  expect(
    getComputedStyle(frame.querySelector("[data-window-body]") as HTMLElement)
      .paddingBottom,
  ).toBe("21px");
});
