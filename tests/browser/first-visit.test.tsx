import { render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";
import { Desktop } from "../../apps/desktop/src/features/desktop/desktop";
import { defaultSite } from "../../apps/desktop/src/features/site/model";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
let container: HTMLDivElement;
let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  container?.remove();
  localStorage.clear();
  history.replaceState(null, "", location.pathname);
});
for (const [width, height] of [
  [1440, 1000],
  [390, 844],
  [844, 390],
]) {
  test(`first visit enters a visible interactive desktop at ${width}x${height}`, async () => {
    await page.viewport(width, height);
    localStorage.clear();
    history.replaceState(null, "", location.pathname);
    container = document.createElement("div");
    document.body.append(container);
    cleanup = (
      await render(
        container,
        <Desktop initial={structuredClone(defaultSite)} />,
      )
    ).cleanup;
    await expect.element(page.getByLabelText("搜索关键词")).toBeVisible();
    await expect
      .poll(() => container.querySelector("[data-welcome]"))
      .toBeNull();
    expect(localStorage.getItem("draco.visited")).toBeNull();
    await expect.element(page.getByLabelText("搜索关键词")).toBeVisible();
    await expect
      .poll(() => {
        const el = container.querySelector<HTMLElement>("[data-desktop-home]");
        return el ? Number(getComputedStyle(el).opacity) : 0;
      })
      .toBe(1);
    const search = container
      .querySelector("[data-home-search]")
      ?.getBoundingClientRect();
    expect(search?.width).toBeGreaterThan(100);
    expect(search?.top).toBeGreaterThanOrEqual(0);
    expect(search?.bottom).toBeLessThan(height);
    await page.getByLabelText("搜索关键词").fill("desktop ready");
    await expect
      .element(page.getByLabelText("搜索关键词"))
      .toHaveValue("desktop ready");
    await page
      .getByRole("button", { name: "设置", exact: true })
      .last()
      .click();
    await expect
      .element(page.getByRole("button", { name: "深色", exact: true }))
      .toBeVisible();
  });
}
