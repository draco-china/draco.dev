import { render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { afterEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
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
  vi.restoreAllMocks();
  localStorage.clear();
  history.replaceState(null, "", location.pathname);
});
async function mount(visited = true) {
  history.replaceState(null, "", location.pathname);
  localStorage.clear();
  if (visited) localStorage.setItem("draco.visited", "1");
  host = document.createElement("div");
  document.body.append(host);
  cleanup = (
    await render(host, <Desktop initial={structuredClone(defaultSite)} />)
  ).cleanup;
}
test("first visit opens the desktop without a welcome screen", async () => {
  await mount(false);
  await expect.element(page.getByLabelText("搜索关键词")).toBeVisible();
  expect(host.querySelector("[data-welcome]")).toBeNull();
});
test("settings persist appearance and window minimizes, restores, closes", async () => {
  await page.viewport(1440, 1000);
  await mount();
  await expect.element(page.getByLabelText("搜索关键词")).toBeVisible();
  await page.getByRole("button", { name: "设置", exact: true }).last().click();
  await page.getByRole("button", { name: "深色", exact: true }).click();
  await page.getByRole("button", { name: "紫", exact: true }).click();
  await expect
    .poll(
      () =>
        JSON.parse(localStorage.getItem("preferences.v2") || "{}").overrides,
    )
    .toMatchObject({ theme: "dark", accent: "purple" });
  await page.getByRole("button", { name: "最小化设置" }).click();
  await expect
    .poll(
      () =>
        document.querySelector<HTMLElement>('[data-window="settings"]')?.style
          .display,
    )
    .toBe("none");
  await page.getByRole("button", { name: "设置", exact: true }).last().click();
  await expect
    .element(page.getByRole("button", { name: "深色", exact: true }))
    .toBeVisible();
  await page.getByRole("button", { name: "关闭设置" }).click();
  await expect
    .poll(() => document.querySelector('[data-window="settings"]'))
    .toBeNull();
});
test("search input survives rotation and select Escape preserves settings", async () => {
  await page.viewport(390, 844);
  await mount();
  await page.getByLabelText("搜索关键词").fill("中文 & x=1");
  await page.viewport(844, 390);
  await expect
    .element(page.getByLabelText("搜索关键词"))
    .toHaveValue("中文 & x=1");
  await page.getByRole("button", { name: "设置", exact: true }).last().click();
  const select = page.getByRole("combobox", { name: "图标外观" });
  await select.click();
  await expect
    .element(page.getByRole("listbox", { name: "图标外观" }))
    .toHaveFocus();
  await userEvent.keyboard("{Escape}");
  await expect.element(select).toHaveFocus();
  await expect.element(select).toBeVisible();
});

test("desktop opens a resumable application module and excludes retired apps", async () => {
  await page.viewport(1440, 1000);
  await mount();
  await page
    .getByRole("button", { name: "关于我", exact: true })
    .last()
    .click();
  await expect
    .element(page.getByRole("heading", { name: "Draco", exact: true }))
    .toBeVisible();
  expect(new URL(location.href).searchParams.get("app")).toBe("about");
  expect(host.querySelector('[data-window="account"]')).toBeNull();
  expect(host.querySelector('[data-window="manage"]')).toBeNull();
  await expect
    .poll(() =>
      host
        .querySelector('[data-window="about"]')
        ?.getAnimations()
        .some((animation) => animation.playState === "running"),
    )
    .toBe(false);
  await page.getByRole("button", { name: "关闭关于我" }).click();
  await expect
    .poll(() => host.querySelector('[data-window="about"]'))
    .toBeNull();
});

test("maximize reverses position transitions and restores the original window", async () => {
  await page.viewport(1440, 1000);
  await mount();
  await page.getByRole("button", { name: "设置", exact: true }).last().click();
  const frame = () =>
    host.querySelector<HTMLElement>('[data-window="settings"]');
  await expect
    .poll(() =>
      frame()
        ?.getAnimations()
        .some((a) => a.playState === "running"),
    )
    .toBe(false);
  await expect
    .poll(() => frame()?.getBoundingClientRect().left)
    .toBe(Number.parseFloat(frame()?.style.left || "0"));
  const left = frame()?.getBoundingClientRect().left;
  await page.getByRole("button", { name: "最大化设置", exact: true }).click();
  await expect
    .poll(() =>
      frame()
        ?.getAnimations()
        .some(
          (a) => a instanceof CSSTransition && a.transitionProperty === "left",
        ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "恢复设置", exact: true }).click();
  await expect.poll(() => frame()?.getBoundingClientRect().left).toBe(left);
  expect(frame()?.hasAttribute("data-maximized")).toBe(false);
  expect(frame()?.hasAttribute("data-focused")).toBe(true);
});

test("maximized window fills the viewport and hides system chrome until restored", async () => {
  await page.viewport(1440, 1000);
  await mount();
  await page.getByRole("button", { name: "设置", exact: true }).last().click();
  await expect
    .poll(() => host.querySelector('[data-window="settings"]'))
    .not.toBeNull();
  const frame = host.querySelector<HTMLElement>('[data-window="settings"]');
  await expect.poll(() => frame?.getBoundingClientRect().height).toBe(600);
  const original = frame?.getBoundingClientRect();
  await page.getByRole("button", { name: "最大化设置", exact: true }).click();
  await expect
    .poll(() => frame?.getBoundingClientRect().height, { timeout: 5000 })
    .toBe(1000);
  expect(frame?.getBoundingClientRect().width).toBe(1440);
  expect(frame?.getBoundingClientRect().top).toBe(0);
  await expect
    .element(
      page.getByRole("navigation", { name: "应用程序", includeHidden: true }),
    )
    .not.toBeVisible();
  expect(
    host.querySelector<HTMLElement>("[data-system-menu-bar]")?.hidden,
  ).toBe(true);
  expect(host.querySelector<HTMLElement>("[data-desktop-home]")?.inert).toBe(
    true,
  );
  await userEvent.keyboard("{Escape}");
  await expect
    .poll(() => frame?.getBoundingClientRect().height)
    .toBe(original?.height);
  await expect
    .poll(() => frame?.getBoundingClientRect().width)
    .toBe(original?.width);
  expect(host.querySelector('[data-window="settings"]')).toBe(frame);
  await expect
    .element(page.getByRole("navigation", { name: "应用程序" }))
    .toBeVisible();
  expect(
    host.querySelector<HTMLElement>("[data-system-menu-bar]")?.hidden,
  ).toBe(false);
  expect(host.querySelector<HTMLElement>("[data-desktop-home]")?.inert).toBe(
    false,
  );
});

test("system menu bar shows branding and time on desktop and opens welcome", async () => {
  history.replaceState(null, "", location.pathname);
  await page.viewport(1440, 1000);
  await mount();
  const bar = () => host.querySelector<HTMLElement>("[data-system-menu-bar]");
  await expect.poll(() => bar()?.getBoundingClientRect().height).toBe(36);
  expect(bar()?.querySelector("img")?.getAttribute("src")).toBe("/favicon.svg");
  expect(bar()?.textContent).toContain("draco.dev");
  expect(bar()?.querySelectorAll("button")).toHaveLength(1);
  expect(bar()?.querySelector("svg")).toBeNull();
  expect(bar()?.querySelector("time")?.textContent).toMatch(/\d{2}:\d{2}/);
  await page.getByRole("button", { name: "打开欢迎页" }).click();
  await expect
    .element(page.getByRole("button", { name: "进入桌面" }))
    .toBeVisible();
  await expect.poll(() => bar()?.getBoundingClientRect().height).toBe(0);
  await page.getByRole("button", { name: "进入桌面" }).click();
  await expect.poll(() => bar()?.getBoundingClientRect().height).toBe(36);
  await expect
    .element(page.getByRole("textbox", { name: "搜索关键词" }))
    .toBeVisible();
  for (let cycle = 0; cycle < 2; cycle++) {
    await page.getByRole("button", { name: "打开欢迎页" }).click();
    await expect
      .element(page.getByRole("button", { name: "进入桌面" }))
      .toBeVisible();
    await page.getByRole("button", { name: "进入桌面" }).click();
    await expect
      .element(page.getByRole("textbox", { name: "搜索关键词" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "打开音乐", exact: true }))
      .toBeVisible();
  }
  await page.viewport(390, 844);
  await expect.poll(() => bar()?.getBoundingClientRect().height).toBe(0);
  expect(document.documentElement.scrollTop).toBe(0);
});

test("close intent interrupts an opening window without leaving its DOM", async () => {
  await page.viewport(1440, 1000);
  await mount();
  await page
    .getByRole("button", { name: "关于我", exact: true })
    .last()
    .click();
  await expect
    .poll(() => host.querySelector('[data-window="about"] button.close'))
    .not.toBeNull();
  // Dispatch on the actual control while its frame may still be entering.
  (
    host.querySelector(
      '[data-window="about"] button.close',
    ) as HTMLButtonElement
  ).click();
  await expect
    .poll(() => host.querySelector('[data-window="about"]'))
    .toBeNull();
});

test("Dock restore supersedes an unfinished minimize without losing application state", async () => {
  await page.viewport(1440, 1000);
  await mount();
  await page
    .getByRole("button", { name: "应用导航", exact: true })
    .last()
    .click();
  await page.getByLabelText("搜索网站").fill("保留搜索");
  await expect.element(page.getByText("没有找到匹配的网站")).toBeVisible();
  const frame = host.querySelector('[data-window="navigation"]') as HTMLElement;
  await expect
    .poll(() =>
      frame
        .getAnimations()
        .some((animation) => animation.playState === "running"),
    )
    .toBe(false);
  await page
    .getByRole("button", { name: "最小化应用导航", exact: true })
    .click();
  await expect
    .poll(() =>
      frame
        .getAnimations()
        .some((animation) => animation.playState === "running"),
    )
    .toBe(true);
  // Hold the real outgoing animation so the subsequent intent necessarily interrupts it.
  const outgoing = frame
    .getAnimations()
    .find((animation) => animation.playState === "running");
  outgoing?.pause();
  await page
    .getByRole("button", { name: "应用导航", exact: true })
    .last()
    .click();
  await expect.poll(() => outgoing?.playState).toBe("idle");
  await expect.element(page.getByLabelText("搜索网站")).toHaveValue("保留搜索");
  await expect
    .poll(() =>
      frame
        .getAnimations()
        .some((animation) => animation.playState === "running"),
    )
    .toBe(false);
  expect(host.querySelector('[data-window="navigation"]')).toBe(frame);
  expect(getComputedStyle(frame).display).not.toBe("none");
  expect(getComputedStyle(frame).opacity).toBe("1");
  expect(new URL(location.href).searchParams.get("app")).toBe("navigation");
});
