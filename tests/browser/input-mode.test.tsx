import { render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { Desktop } from "../../apps/desktop/src/features/desktop/desktop";
import { defaultSite } from "../../apps/desktop/src/features/site/model";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);

test("input capability changes keep the active application and its form mounted", async () => {
  await page.viewport(1280, 900);
  const originalMatch = window.matchMedia.bind(window);
  const listeners = new Set<EventListenerOrEventListenerObject>();
  let precise = true;
  const capability = {
    get matches() {
      return precise;
    },
    media: "(min-width:1024px) and (hover:hover) and (pointer:fine)",
    addEventListener(
      _type: string,
      listener: EventListenerOrEventListenerObject,
    ) {
      listeners.add(listener);
    },
    removeEventListener(
      _type: string,
      listener: EventListenerOrEventListenerObject,
    ) {
      listeners.delete(listener);
    },
  } as MediaQueryList;
  const spy = vi
    .spyOn(window, "matchMedia")
    .mockImplementation((query) =>
      query === capability.media ? capability : originalMatch(query),
    );
  const host = document.createElement("div");
  document.body.append(host);
  history.replaceState(null, "", `${location.pathname}?app=navigation`);
  localStorage.setItem("draco.visited", "1");
  const view = await render(
    host,
    <Desktop initial={structuredClone(defaultSite)} />,
  );
  try {
    await page.getByLabelText("搜索网站").fill("kept through input change");
    const input = host.querySelector('input[aria-label="搜索网站"]');
    const frame = host.querySelector('[data-window="navigation"]');
    for (const next of [false, true, false, true]) {
      precise = next;
      for (const listener of listeners) {
        const event = new Event("change");
        if (typeof listener === "function") listener(event);
        else listener.handleEvent(event);
      }
      await expect
        .poll(() => {
          const bar = host.querySelector(
            "[data-system-menu-bar]",
          ) as HTMLElement | null;
          return bar ? !bar.hidden : false;
        })
        .toBe(next);
      expect(host.querySelector('[data-window="navigation"]')).toBe(frame);
      expect(host.querySelector('input[aria-label="搜索网站"]')).toBe(input);
      await expect
        .element(page.getByLabelText("搜索网站"))
        .toHaveValue("kept through input change");
      expect(new URL(location.href).searchParams.get("app")).toBe("navigation");
    }
  } finally {
    view.cleanup();
    host.remove();
    spy.mockRestore();
    localStorage.clear();
    history.replaceState(null, "", location.pathname);
  }
});
