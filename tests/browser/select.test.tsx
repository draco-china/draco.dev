import { component$, render, useSignal } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { Select } from "@workspace/ui/select";
import { afterEach, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import "@workspace/theme";

const Fixture = component$(() => {
  const value = useSignal("google");
  return (
    <div data-window-body>
      <button type="button">Before</button>
      <Select
        aria-label="搜索引擎"
        value={value.value}
        onChange$={(next) => {
          value.value = next;
        }}
        options={[
          { value: "google", label: "Google" },
          { value: "disabled", label: "Disabled", disabled: true },
          { value: "bing", label: "Bing" },
          { value: "baidu", label: "百度" },
        ]}
      />
      <button type="button">After</button>
      <output>{value.value}</output>
    </div>
  );
});
const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
let host: HTMLDivElement;
let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  host?.remove();
});
async function mount() {
  host = document.createElement("div");
  document.body.append(host);
  cleanup = (await render(host, <Fixture />)).cleanup;
}
test("keyboard skips disabled options, commits and restores focus", async () => {
  await mount();
  const select = page.getByRole("combobox", { name: "搜索引擎" });
  await select.click();
  await expect.element(page.getByRole("listbox")).toHaveFocus();
  await userEvent.keyboard("{ArrowDown}{Enter}");
  await expect.element(select).toHaveTextContent("Bing");
  await expect.element(select).toHaveFocus();
  await select.click();
  await userEvent.keyboard("{End}{Enter}");
  await expect.element(select).toHaveTextContent("百度");
});
test("Escape cancels without reaching the surrounding application", async () => {
  await mount();
  let escaped = false;
  const listener = (event: KeyboardEvent) => {
    if (event.key === "Escape") escaped = true;
  };
  document.addEventListener("keydown", listener);
  try {
    const select = page.getByRole("combobox");
    await select.click();
    await userEvent.keyboard("{End}{Escape}");
    await expect.element(select).toHaveAttribute("aria-expanded", "false");
    await expect.element(select).toHaveTextContent("Google");
    await expect.element(select).toHaveFocus();
    expect(escaped).toBe(false);
  } finally {
    document.removeEventListener("keydown", listener);
  }
});
test("Tab advances focus and menus remain inside a narrow viewport", async () => {
  await page.viewport(360, 640);
  await mount();
  const select = page.getByRole("combobox");
  await select.click();
  const box = page.getByRole("listbox").element().getBoundingClientRect();
  expect(box.left).toBeGreaterThanOrEqual(0);
  expect(box.right).toBeLessThanOrEqual(360);
  await userEvent.keyboard("{Tab}");
  await expect
    .element(page.getByRole("button", { name: "After" }))
    .toHaveFocus();
  await select.click();
  await page.viewport(820, 700);
  await expect.element(select).toHaveAttribute("aria-expanded", "false");
});

const LongFixture = component$(() => (
  <div style={{ position: "fixed", left: "430px", top: "280px" }}>
    <Select
      aria-label="长列表"
      value="0"
      onChange$={() => undefined}
      options={Array.from({ length: 30 }, (_, index) => ({
        value: String(index),
        label: `选项 ${index}`,
      }))}
    />
  </div>
));

test("long menus stay in the trigger segment and the visible keyboard viewport", async () => {
  await page.viewport(900, 700);
  const viewportDescriptor = Object.getOwnPropertyDescriptor(
    window,
    "viewport",
  );
  const visualDescriptor = Object.getOwnPropertyDescriptor(
    window,
    "visualViewport",
  );
  const visual = Object.assign(new EventTarget(), {
    offsetLeft: 30,
    offsetTop: 80,
    width: 700,
    height: 380,
  });
  Object.defineProperty(window, "viewport", {
    configurable: true,
    value: {
      segments: [new DOMRect(0, 0, 400, 700), new DOMRect(420, 0, 480, 700)],
    },
  });
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: visual,
  });
  try {
    host = document.createElement("div");
    document.body.append(host);
    cleanup = (await render(host, <LongFixture />)).cleanup;
    const select = page.getByRole("combobox", { name: "长列表" });
    await select.click();
    await expect.element(page.getByRole("listbox")).toHaveFocus();
    const panel = page.getByRole("listbox").element();
    await expect
      .poll(() => panel.getBoundingClientRect().left)
      .toBeGreaterThanOrEqual(428);
    const box = panel.getBoundingClientRect();
    expect(box.right).toBeLessThanOrEqual(722);
    expect(box.top).toBeGreaterThanOrEqual(88);
    expect(box.bottom).toBeLessThanOrEqual(452);
    expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);
    await userEvent.keyboard("{End}");
    await expect.poll(() => panel.scrollTop).toBeGreaterThan(0);
    visual.dispatchEvent(new Event("scroll"));
    await expect.element(select).toHaveAttribute("aria-expanded", "false");
  } finally {
    if (viewportDescriptor)
      Object.defineProperty(window, "viewport", viewportDescriptor);
    else Reflect.deleteProperty(window, "viewport");
    if (visualDescriptor)
      Object.defineProperty(window, "visualViewport", visualDescriptor);
    else Reflect.deleteProperty(window, "visualViewport");
  }
});
