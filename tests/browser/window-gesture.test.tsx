import { render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { afterEach, expect, test } from "vitest";
import { commands, page } from "vitest/browser";
import { Desktop } from "../../apps/desktop/src/features/desktop/desktop";
import { defaultSite } from "../../apps/desktop/src/features/site/model";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
let host: HTMLDivElement;
let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  host?.remove();
  localStorage.clear();
  history.replaceState(null, "", location.pathname);
});
async function mount(app: string, desktop = false) {
  await page.viewport(desktop ? 1440 : 390, desktop ? 1000 : 844);
  localStorage.setItem("draco.visited", "1");
  history.replaceState(null, "", location.pathname);
  host = document.createElement("div");
  document.body.append(host);
  cleanup = (
    await render(host, <Desktop initial={structuredClone(defaultSite)} />)
  ).cleanup;
  await expect.element(page.getByLabelText("搜索关键词")).toBeVisible();
  await page
    .getByRole("button", {
      name: app === "music" ? "音乐" : "应用导航",
      exact: true,
    })
    .last()
    .click();
  await expect.poll(currentApp).toBe(app);
  await expect
    .poll(() => host.querySelector(`[data-window="${app}"]`))
    .not.toBeNull();
  const frame = host.querySelector<HTMLElement>(`[data-window="${app}"]`);
  if (!frame) throw new Error("Window did not mount");
  await expect
    .element(page.getByLabelText(app === "music" ? "搜索歌曲" : "搜索网站"))
    .toBeVisible();
  return frame;
}
const currentApp = () => new URL(location.href).searchParams.get("app");

test("short title-bar drag springs back without closing the touch application", async () => {
  const frame = await mount("navigation");
  await commands.windowDrag("navigation", 80);
  await expect.poll(() => frame.getAnimations().length).toBe(0);
  await expect
    .poll(() => new DOMMatrixReadOnly(getComputedStyle(frame).transform).m42)
    .toBe(0);
  expect(currentApp()).toBe("navigation");
  expect(host.querySelector('[data-window="navigation"]')).toBe(frame);
});

test("long title-bar drag closes and releases an ordinary application", async () => {
  await mount("navigation");
  await commands.windowDrag("navigation", 160);
  await expect
    .poll(() => host.querySelector('[data-window="navigation"]'))
    .toBeNull();
  await expect.poll(currentApp).toBeNull();
});

test("pulling music down preserves its instance and Dock restores its input", async () => {
  const frame = await mount("music");
  await page.getByLabelText("搜索歌曲").fill("下拉后保留");
  const audio = frame.querySelector("audio");
  expect(audio).toBeInstanceOf(HTMLAudioElement);
  await commands.windowDrag("music", 160);
  await expect.poll(() => frame.style.display).toBe("none");
  await expect.poll(currentApp).toBeNull();
  expect(host.querySelector('[data-window="music"]')).toBe(frame);
  await page.getByRole("button", { name: "音乐", exact: true }).last().click();
  await expect
    .element(page.getByLabelText("搜索歌曲"))
    .toHaveValue("下拉后保留");
  expect(host.querySelector('[data-window="music"] audio')).toBe(audio);
});

test("a new pointer drag inherits the in-flight spring position", async () => {
  await mount("navigation");
  const sample = await commands.windowDragInterrupted("navigation");
  expect(sample.before).toBeGreaterThan(20);
  expect(Math.abs(sample.pressed - sample.before)).toBeLessThan(1);
  expect(sample.moved - sample.pressed).toBeGreaterThan(25);
  expect(sample.moved - sample.pressed).toBeLessThan(35);
  expect(currentApp()).toBe("navigation");
});

test("controlled pointer cancellation after a real drag restores music and retains input", async () => {
  const frame = await mount("music");
  await page.getByLabelText("搜索歌曲").fill("取消手势保留");
  await commands.windowDrag("music", 160, true);
  await expect
    .poll(() => new DOMMatrixReadOnly(getComputedStyle(frame).transform).m42)
    .toBe(0);
  await expect
    .element(page.getByLabelText("搜索歌曲"))
    .toHaveValue("取消手势保留");
  expect(currentApp()).toBe("music");
  expect(host.querySelector('[data-window="music"]')).toBe(frame);
});

test("desktop title-bar dragging retains the released position and window instance", async () => {
  const frame = await mount("navigation", true);
  await expect.poll(() => frame.getAnimations().length).toBe(0);
  const initial = frame.getBoundingClientRect();
  await commands.windowDrag("navigation", 80);
  await expect
    .poll(() => frame.getBoundingClientRect().top)
    .toBeCloseTo(initial.top + 80, 0);
  await expect.poll(() => frame.getAnimations().length).toBe(0);
  const released = frame.getBoundingClientRect();
  expect(released.left).toBeCloseTo(initial.left, 0);
  expect(released.top).toBeCloseTo(initial.top + 80, 0);
  expect(host.querySelector('[data-window="navigation"]')).toBe(frame);
  expect(currentApp()).toBe("navigation");
  expect(new DOMMatrixReadOnly(getComputedStyle(frame).transform).m42).toBe(0);
});

test("changing from touch to desktop during a held drag clears the gesture and preserves input", async () => {
  const frame = await mount("navigation");
  await page.getByLabelText("搜索网站").fill("模式切换保留");
  await commands.windowDrag("navigation", 80, false, true);
  try {
    await expect
      .poll(() => new DOMMatrixReadOnly(getComputedStyle(frame).transform).m42)
      .toBe(80);
    expect(frame.hasAttribute("data-dragging")).toBe(true);
    await page.viewport(1440, 1000);
    await expect
      .poll(() => host.querySelector('[data-mode="desktop"]'))
      .not.toBeNull();
    await expect
      .poll(() => new DOMMatrixReadOnly(getComputedStyle(frame).transform).m42)
      .toBe(0);
    expect(frame.hasAttribute("data-dragging")).toBe(false);
    expect(host.querySelector('[data-window="navigation"]')).toBe(frame);
    await expect
      .element(page.getByLabelText("搜索网站"))
      .toHaveValue("模式切换保留");
  } finally {
    await commands.windowRelease();
  }
  await expect.poll(() => frame.getAnimations().length).toBe(0);
  expect(currentApp()).toBe("navigation");
  expect(host.querySelector('[data-window="navigation"]')).toBe(frame);
});
