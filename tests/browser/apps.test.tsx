import { $, render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import About from "@workspace/about";
import type { AppHost } from "@workspace/app-sdk";
import Navigation from "@workspace/navigation";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
let container: HTMLDivElement;
let cleanup: (() => void) | undefined;
const appHost: AppHost = {
  mode: "standalone",
  appearance: { theme: "light", accent: "blue", reducedMotion: true },
  visible: true,
  path: "/",
  openUrl$: $((url: string) => {
    document.body.dataset.openedUrl = url;
  }),
  navigate$: $(() => {}),
  setTitle$: $(() => {}),
};
afterEach(() => {
  cleanup?.();
  container?.remove();
  delete document.body.dataset.openedUrl;
});
async function mount(app: "about" | "navigation") {
  container = document.createElement("div");
  document.body.append(container);
  const Component = { about: About, navigation: Navigation }[app];
  cleanup = (await render(container, <Component host={appHost} />)).cleanup;
}
test("about module renders configured personal content without desktop chrome", async () => {
  await mount("about");
  await expect
    .element(page.getByRole("heading", { name: "Draco" }))
    .toBeVisible();
  expect(container.querySelector("iframe")).toBeNull();
});
test("navigation exposes read-only external links without a site editor", async () => {
  await mount("navigation");
  await page.getByLabelText("搜索网站").fill("GitHub");
  const link = page.getByRole("link").filter({ hasText: "GitHub" }).first();
  await expect.element(link).toHaveAttribute("target", "_blank");
  await expect.element(link).toHaveAttribute("rel", "noopener noreferrer");
  expect(container.textContent).not.toContain("添加网站");
  expect(container.querySelector("form")).toBeNull();
  expect(document.body.dataset.openedUrl).toBeUndefined();
});
