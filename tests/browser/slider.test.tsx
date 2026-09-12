import { component$, render, useSignal } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { Slider } from "@workspace/ui";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
const Fixture = component$(() => {
  const value = useSignal("20");
  return (
    <div>
      <Slider
        aria-label="Progress"
        min={10}
        max={30}
        step={5}
        value={value.value}
        onInput$={(_, el) => {
          value.value = el.value;
        }}
      />
      <Slider aria-label="Uncontrolled" min={0} max={10} />
      <Slider aria-label="Disabled" disabled value={50} />
      <Slider aria-label="Overflow" value={200} />
      <Slider aria-label="Empty" min={10} max={10} value={10} />
    </div>
  );
});
test("slider keyboard changes, native defaults and bounds keep the visual progress synchronized", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const view = await render(host, <Fixture />);
  try {
    const slider = page.getByRole("slider", { name: "Progress" });
    (slider.element() as HTMLInputElement).focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect.element(slider).toHaveValue("25");
    await expect
      .poll(() =>
        (slider.element() as HTMLElement).style.getPropertyValue(
          "--slider-progress",
        ),
      )
      .toBe("75%");
    await userEvent.keyboard("{End}{ArrowRight}");
    await expect.element(slider).toHaveValue("30");
    await userEvent.keyboard("{Home}{ArrowLeft}");
    await expect.element(slider).toHaveValue("10");
    const raw = page.getByRole("slider", { name: "Uncontrolled" });
    (raw.element() as HTMLElement).focus();
    await expect.element(raw).toHaveValue("5");
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .poll(() =>
        (raw.element() as HTMLElement).style.getPropertyValue(
          "--slider-progress",
        ),
      )
      .toBe("60%");
    await expect
      .element(page.getByRole("slider", { name: "Disabled" }))
      .toBeDisabled();
    expect(
      getComputedStyle(page.getByRole("slider", { name: "Disabled" }).element())
        .opacity,
    ).toBe("0.45");
    expect(
      (
        page.getByRole("slider", { name: "Overflow" }).element() as HTMLElement
      ).style.getPropertyValue("--slider-progress"),
    ).toBe("100%");
    expect(
      (
        page.getByRole("slider", { name: "Empty" }).element() as HTMLElement
      ).style.getPropertyValue("--slider-progress"),
    ).toBe("0%");
  } finally {
    view.cleanup();
    host.remove();
  }
});
