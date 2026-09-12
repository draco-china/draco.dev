import { $, render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import type { AppHost } from "@workspace/app-sdk";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { ModuleApp } from "../../apps/desktop/src/features/desktop/module-app";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
const host: AppHost = {
  mode: "desktop",
  appearance: { theme: "light", accent: "blue", reducedMotion: true },
  path: "/",
  visible: true,
  openUrl$: $(() => {}),
  navigate$: $(() => {}),
  setTitle$: $(() => {}),
};
test("module renders the real resumable application", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const result = await render(container, <ModuleApp id="about" host={host} />);
  try {
    await expect
      .element(page.getByRole("heading", { name: "Draco", exact: true }))
      .toBeVisible();
    expect(container.textContent).not.toContain("正在打开应用");
  } finally {
    result.cleanup();
    container.remove();
  }
});
