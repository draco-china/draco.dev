import type { BrowserCommand } from "vitest/node";
import "@vitest/browser-playwright";

export const windowDrag: BrowserCommand<
  [app: string, distance: number, cancel?: boolean, hold?: boolean]
> = async ({ page }, app, distance, cancel = false, hold = false) => {
  const frame = page
    .frameLocator('[data-vitest="true"]')
    .locator(`[data-window="${app}"]`);
  await frame.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations()
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  const bar = frame.locator("[data-window-bar]");
  await bar.hover();
  if (cancel)
    await bar.evaluate((element) => {
      element.addEventListener(
        "pointerdown",
        (event) =>
          element.setAttribute(
            "data-test-pointer",
            String((event as PointerEvent).pointerId),
          ),
        { once: true },
      );
    });
  const box = await bar.boundingBox();
  if (!box) throw new Error("Window title bar is missing");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2,
    box.y + box.height / 2 + distance,
    { steps: 12 },
  );
  if (cancel)
    await bar.evaluate((element) => {
      element.dispatchEvent(
        new PointerEvent("pointercancel", {
          bubbles: true,
          pointerId: Number(element.getAttribute("data-test-pointer")),
          isPrimary: true,
        }),
      );
      element.removeAttribute("data-test-pointer");
    });
  if (!hold) await page.mouse.up();
};

export const windowDragInterrupted: BrowserCommand<[app: string]> = async (
  context,
  app,
) => {
  const { page } = context;
  const frame = page
    .frameLocator('[data-vitest="true"]')
    .locator(`[data-window="${app}"]`);
  // Finish the opening motion before intercepting the spring from a real drag.
  await frame.evaluate(async (element) => {
    const deadline = performance.now() + 5000;
    let settled = 0;
    while (settled < 3) {
      if (performance.now() > deadline)
        throw new Error("Window did not settle");
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      settled = element.getAnimations().length === 0 ? settled + 1 : 0;
    }
    const original = element.animate.bind(element);
    element.animate = (...args: Parameters<Element["animate"]>) => {
      const animation = original(...args);
      animation.pause();
      animation.currentTime = 0;
      element.animate = original;
      return animation;
    };
  });
  await windowDrag(context, app, 80);
  const sample = async () =>
    frame.evaluate(async (element) => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      return new DOMMatrixReadOnly(getComputedStyle(element).transform).m42;
    });
  await frame.evaluate(async (element) => {
    const deadline = performance.now() + 3000;
    while (
      !element
        .getAnimations()
        .some((animation) => animation.playState === "paused")
    ) {
      if (performance.now() > deadline)
        throw new Error("Spring animation did not start");
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    }
  });
  const before = await sample();
  const box = await frame.locator("[data-window-bar]").boundingBox();
  if (!box) throw new Error("Window title bar is missing");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await frame.locator("[data-window-bar]").evaluate(async (element) => {
    const frame = element.closest("[data-window]");
    const deadline = performance.now() + 3000;
    while (!frame?.hasAttribute("data-dragging")) {
      if (performance.now() > deadline) throw new Error("Drag did not start");
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    }
  });
  const pressed = await sample();
  await page.mouse.move(x, y + 30);
  const moved = await sample();
  await page.mouse.up();
  return { before, pressed, moved };
};

export const windowRelease: BrowserCommand<[]> = async ({ page }) => {
  await page.mouse.up();
};

declare module "vitest/browser" {
  interface BrowserCommands {
    windowDrag(
      app: string,
      distance: number,
      cancel?: boolean,
      hold?: boolean,
    ): Promise<void>;
    windowRelease(): Promise<void>;
    windowDragInterrupted(
      app: string,
    ): Promise<{ before: number; pressed: number; moved: number }>;
  }
}
