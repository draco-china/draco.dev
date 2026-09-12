import { render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { initializeAppearance } from "../../apps/desktop/src/features/desktop/appearance-init";
import { Desktop } from "../../apps/desktop/src/features/desktop/desktop";
import { defaultSite } from "../../apps/desktop/src/features/site/model";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
test("desktop appearance initializes before boot and follows system through desktop and applications", async () => {
  const dark = Object.assign(new EventTarget(), {
    matches: true,
    media: "(prefers-color-scheme:dark)",
    onchange: null,
    addListener() {},
    removeListener() {},
  });
  const reduced = Object.assign(new EventTarget(), {
    matches: true,
    media: "(prefers-reduced-motion:reduce)",
    onchange: null,
    addListener() {},
    removeListener() {},
  });
  const native = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query) =>
    query === dark.media
      ? dark
      : query === reduced.media
        ? reduced
        : native(query),
  );
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.spyOn(HTMLImageElement.prototype, "decode").mockReturnValue(pending);
  localStorage.clear();
  localStorage.setItem(
    "preferences.v2",
    JSON.stringify({
      version: 2,
      overrides: { theme: "system", motion: "system", accent: "purple" },
    }),
  );
  history.replaceState(null, "", location.pathname);
  initializeAppearance(defaultSite.settings);
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(document.documentElement.classList.contains("reduce-motion")).toBe(
    true,
  );
  const container = document.createElement("div");
  document.body.append(container);
  let cleanup: (() => void) | undefined;
  try {
    cleanup = (
      await render(
        container,
        <Desktop initial={structuredClone(defaultSite)} />,
      )
    ).cleanup;
    await expect
      .poll(() => container.querySelector("[data-boot-screen]"))
      .not.toBeNull();
    expect(document.documentElement.dataset.accent).toBe("purple");
    release();
    await expect.element(page.getByLabelText("搜索关键词")).toBeVisible();
    dark.matches = false;
    dark.dispatchEvent(new Event("change"));
    reduced.matches = false;
    reduced.dispatchEvent(new Event("change"));
    await expect
      .poll(() => document.documentElement.dataset.theme)
      .toBe("light");
    await expect
      .poll(() => document.documentElement.classList.contains("reduce-motion"))
      .toBe(false);
    await page
      .getByRole("button", { name: "设置", exact: true })
      .last()
      .click();
    dark.matches = true;
    dark.dispatchEvent(new Event("change"));
    reduced.matches = true;
    reduced.dispatchEvent(new Event("change"));
    await expect
      .poll(() => document.documentElement.dataset.theme)
      .toBe("dark");
    await expect
      .poll(() => document.documentElement.classList.contains("reduce-motion"))
      .toBe(true);
    await page.getByRole("button", { name: "浅色", exact: true }).click();
    dark.matches = false;
    dark.dispatchEvent(new Event("change"));
    dark.matches = true;
    dark.dispatchEvent(new Event("change"));
    await expect
      .poll(() => document.documentElement.dataset.theme)
      .toBe("light");
  } finally {
    release();
    cleanup?.();
    container.remove();
    vi.restoreAllMocks();
    localStorage.clear();
  }
});
