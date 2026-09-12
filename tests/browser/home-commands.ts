import type { BrowserCommand } from "vitest/node";
import "@vitest/browser-playwright";
export const homeWheel: BrowserCommand<[]> = async ({ page }) => {
  const canvas = page
    .frameLocator('[data-vitest="true"]')
    .locator("[data-desktop-home]");
  await canvas.hover({ position: { x: 5, y: 5 } });
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(100);
};
declare module "vitest/browser" {
  interface BrowserCommands {
    homeWheel(): Promise<void>;
  }
}
