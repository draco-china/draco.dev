import { $, render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";
import { WelcomeScreen } from "../../apps/desktop/src/features/desktop/welcome-screen";
import { defaultSite } from "../../apps/desktop/src/features/site/model";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
let host: HTMLDivElement;
let cleanup: (() => void) | undefined;
let entered = 0;
const listener = () => {
  entered++;
};
afterEach(() => {
  cleanup?.();
  host?.remove();
  document.removeEventListener("welcome-enter-test", listener);
});
async function mount(width: number, height: number, reducedMotion = false) {
  await page.viewport(width, height);
  entered = 0;
  document.addEventListener("welcome-enter-test", listener);
  host = document.createElement("div");
  document.body.append(host);
  cleanup = (
    await render(
      host,
      <WelcomeScreen
        profile={defaultSite.profile}
        date="9月11日星期五"
        clock="22:30"
        desktop={width >= 1024}
        reducedMotion={reducedMotion}
        onEnter$={$(() => {
          document.dispatchEvent(new Event("welcome-enter-test"));
        })}
      />,
    )
  ).cleanup;
  await expect
    .element(page.getByRole("button", { name: "进入桌面" }))
    .toBeVisible();
}
test("welcome exits before entering and repeated clicks trigger one navigation", async () => {
  await mount(1440, 900);
  const button = page
    .getByRole("button", { name: "进入桌面" })
    .element() as HTMLButtonElement;
  button.click();
  button.click();
  await expect.poll(() => button.disabled).toBe(true);
  expect(entered).toBe(0);
  await expect.poll(() => entered).toBe(1);
  expect(
    getComputedStyle(host.querySelector("main") as HTMLElement).opacity,
  ).toBe("0");
});
test("reduced welcome uses a short fade and cancels safely when removed", async () => {
  await mount(390, 844, true);
  const main = host.querySelector("main") as HTMLElement;
  await expect
    .poll(() => main.getAnimations({ subtree: true }).length)
    .toBeGreaterThan(0);
  for (const animation of main.getAnimations({ subtree: true }))
    expect(animation.effect?.getTiming().duration).toBe(80);
  const animations = main.getAnimations({ subtree: true });
  cleanup?.();
  cleanup = undefined;
  await expect
    .poll(() => animations.every((animation) => animation.playState === "idle"))
    .toBe(true);
  expect(entered).toBe(0);
});
test("interrupted exit still enters the desktop once", async () => {
  await mount(1440, 900);
  const main = host.querySelector("main") as HTMLElement;
  const button = page.getByRole("button", { name: "进入桌面" });
  await button.click();
  await expect.poll(() => main.getAnimations().length).toBeGreaterThan(0);
  for (const animation of main.getAnimations()) animation.cancel();
  await expect.poll(() => entered).toBe(1);
});
for (const [width, height] of [
  [360, 320],
  [320, 568],
  [844, 390],
]) {
  test(`welcome enter control fits ${width}x${height}`, async () => {
    await mount(width, height);
    const main = host.querySelector("main") as HTMLElement;
    await expect
      .poll(() =>
        main
          .getAnimations({ subtree: true })
          .some((a) => a.playState === "running"),
      )
      .toBe(false);
    const rect = page
      .getByRole("button", { name: "进入桌面" })
      .element()
      .getBoundingClientRect();
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(width);
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.bottom).toBeLessThanOrEqual(height);
  });
}
