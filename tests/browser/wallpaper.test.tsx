import { $, component$, render, useSignal } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { Wallpaper } from "../../apps/desktop/src/features/desktop/wallpaper";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
const Fixture = component$(() => {
  const current = useSignal("alpine");
  return (
    <>
      <Wallpaper appearance={current.value} />
      <button
        type="button"
        onClick$={$(() => {
          current.value = current.value === "aurora" ? "midnight" : "aurora";
        })}
      >
        切换壁纸
      </button>
    </>
  );
});
test("wallpaper crossfade survives interruption and releases old layers", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const result = await render(container, <Fixture />);
  try {
    const layers = () => container.querySelector('[aria-hidden="true"]');
    await expect.poll(() => layers()?.children.length).toBe(1);
    await page.getByRole("button", { name: "切换壁纸" }).click();
    await expect.poll(() => layers()?.children.length).toBe(2);
    await page.getByRole("button", { name: "切换壁纸" }).click();
    await expect.poll(() => layers()?.children.length).toBe(1);
    expect(layers()?.firstElementChild?.className).toContain("brightness");
    document.documentElement.classList.add("reduce-motion");
    await page.getByRole("button", { name: "切换壁纸" }).click();
    await expect.poll(() => layers()?.children.length).toBe(1);
    expect(layers()?.firstElementChild?.className).toContain("aurora");
  } finally {
    result.cleanup();
    container.remove();
    document.documentElement.classList.remove("reduce-motion");
  }
});
