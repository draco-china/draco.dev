import { component$, render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { StandaloneApp } from "@workspace/app-sdk/standalone";
import { afterEach, expect, test } from "vitest";
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
  localStorage.clear();
  history.replaceState(null, "", location.pathname);
});
test("application shell shares glass material with borderless title bar", async () => {
  await page.viewport(1440, 1000);
  history.replaceState(null, "", `${location.pathname}?app=settings`);
  localStorage.setItem("draco.visited", "1");
  host = document.createElement("div");
  document.body.append(host);
  cleanup = (
    await render(host, <Desktop initial={structuredClone(defaultSite)} />)
  ).cleanup;
  await expect
    .element(page.getByRole("button", { name: "深色", exact: true }))
    .toBeVisible();
  const frame = host.querySelector('[data-window="settings"]') as HTMLElement;
  const bar = frame.querySelector("[data-window-bar]") as HTMLElement;
  expect(getComputedStyle(bar).borderBottomWidth).toBe("0px");
  expect(getComputedStyle(bar).backgroundColor).toMatch(
    /rgba\(0, 0, 0, 0\)|transparent/,
  );
  expect(getComputedStyle(frame).borderRadius).toBe("24px");
  const probe = document.createElement("div");
  probe.style.background = "var(--glass)";
  host.append(probe);
  expect(getComputedStyle(frame).backgroundColor).toBe(
    getComputedStyle(probe).backgroundColor,
  );
});
const LongContent = component$(() => (
  <div style="height:2000px">Scrollable application content</div>
));
test("standalone application keeps scroll inside the same glass content shell", async () => {
  await page.viewport(390, 844);
  host = document.createElement("div");
  document.body.append(host);
  cleanup = (
    await render(
      host,
      <StandaloneApp app={LongContent} appId="surface-test" title="Surface" />,
    )
  ).cleanup;
  const main = host.querySelector("[data-standalone-content]") as HTMLElement;
  expect(main.getBoundingClientRect().height).toBe(844);
  expect(getComputedStyle(main).overflowY).toBe("auto");
  main.scrollTop = 300;
  expect(main.scrollTop).toBe(300);
  expect(document.documentElement.scrollTop).toBe(0);
});

test("deep links restore saved windows fully inside a smaller desktop", async () => {
  await page.viewport(1280, 720);
  localStorage.setItem("draco.visited", "1");
  localStorage.setItem(
    "windows.v1",
    JSON.stringify({ navigation: { x: 1200, y: 800, maximized: false } }),
  );
  history.replaceState(null, "", `${location.pathname}?app=navigation`);
  host = document.createElement("div");
  document.body.append(host);
  cleanup = (
    await render(host, <Desktop initial={structuredClone(defaultSite)} />)
  ).cleanup;
  await expect.element(page.getByLabelText("搜索网站")).toBeVisible();
  const frame = host.querySelector('[data-window="navigation"]') as HTMLElement;
  await expect
    .poll(() => {
      const rect = frame.getBoundingClientRect();
      return (
        rect.left >= 24 &&
        rect.right <= innerWidth - 24 &&
        rect.top >= 40 &&
        rect.bottom <= innerHeight - 100
      );
    })
    .toBe(true);
  await page.viewport(1024, 768);
  await expect
    .poll(() => {
      const rect = frame.getBoundingClientRect();
      return (
        rect.left >= 24 &&
        rect.right <= innerWidth - 24 &&
        rect.bottom <= innerHeight - 100
      );
    })
    .toBe(true);
  expect(host.querySelector('[data-window="navigation"]')).toBe(frame);
});
