import { render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";
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
async function mount(app = "") {
  await page.viewport(1440, 1000);
  history.replaceState(
    null,
    "",
    `${location.pathname}${app ? `?app=${app}` : ""}`,
  );
  localStorage.setItem("draco.visited", "1");
  host = document.createElement("div");
  document.body.append(host);
  cleanup = (
    await render(host, <Desktop initial={structuredClone(defaultSite)} />)
  ).cleanup;
  await expect.element(page.getByLabelText("搜索关键词")).toBeVisible();
}
const currentApp = () => new URL(location.href).searchParams.get("app");
test("repeated opens reuse a module while ordinary close releases it", async () => {
  await mount();
  const icon = page.getByRole("button", { name: "关于我", exact: true }).last();
  await icon.click();
  await expect
    .element(page.getByRole("heading", { name: "Draco", exact: true }))
    .toBeVisible();
  const original = host.querySelector('[data-window="about"]');
  await icon.click();
  expect(host.querySelectorAll('[data-window="about"]')).toHaveLength(1);
  expect(host.querySelector('[data-window="about"]')).toBe(original);
  await page.getByRole("button", { name: "关闭关于我" }).click();
  await expect
    .poll(() => host.querySelector('[data-window="about"]'))
    .toBeNull();
  await icon.click();
  await expect
    .element(page.getByRole("heading", { name: "Draco", exact: true }))
    .toBeVisible();
  expect(host.querySelector('[data-window="about"]')).not.toBe(original);
});
test("closing music preserves its player and local input until reopened", async () => {
  await mount();
  const icon = page.getByRole("button", { name: "音乐", exact: true }).last();
  await icon.click();
  await page.getByLabelText("搜索歌曲").fill("保留输入");
  const original = host.querySelector('[data-window="music"]');
  const audio = original?.querySelector("audio");
  expect(audio).toBeInstanceOf(HTMLAudioElement);
  await page.getByRole("button", { name: "关闭音乐" }).click();
  await expect.poll(() => (original as HTMLElement).style.display).toBe("none");
  expect(host.querySelector('[data-window="music"]')).toBe(original);
  await icon.click();
  await expect.element(page.getByLabelText("搜索歌曲")).toHaveValue("保留输入");
  expect(host.querySelector('[data-window="music"] audio')).toBe(audio);
});
test("browser history restores application focus without duplicating windows", async () => {
  await mount();
  await page
    .getByRole("button", { name: "关于我", exact: true })
    .last()
    .click();
  await expect.poll(currentApp).toBe("about");
  await page.getByRole("button", { name: "设置", exact: true }).last().click();
  await expect.poll(currentApp).toBe("settings");
  const about = host.querySelector('[data-window="about"]');
  await expect
    .poll(() =>
      host
        .querySelector('[data-window="settings"]')
        ?.getAttribute("data-focused"),
    )
    .toBe("true");
  history.back();
  await expect.poll(currentApp).toBe("about");
  await expect
    .poll(() =>
      host.querySelector('[data-window="about"]')?.getAttribute("data-focused"),
    )
    .toBe("true");
  expect(currentApp()).toBe("about");
  history.forward();
  await expect.poll(currentApp).toBe("settings");
  await expect
    .poll(() =>
      host
        .querySelector('[data-window="settings"]')
        ?.getAttribute("data-focused"),
    )
    .toBe("true");
  expect(currentApp()).toBe("settings");
  expect(host.querySelector('[data-window="about"]')).toBe(about);
  expect(host.querySelectorAll('[data-window="settings"]')).toHaveLength(1);
});
for (const app of ["account", "manage", "news", "projects", "contact"]) {
  test(`retired ${app} deep link returns to the desktop`, async () => {
    await mount(app);
    await expect.poll(currentApp).toBeNull();
    expect(
      [...host.querySelectorAll<HTMLElement>("[data-window]")].filter(
        (frame) => frame.style.display !== "none",
      ),
    ).toHaveLength(0);
    await expect.element(page.getByLabelText("搜索关键词")).toBeVisible();
  });
}

test("canonical application path wins over a conflicting legacy query on history restore", async () => {
  await mount();
  const original = location.pathname;
  try {
    history.pushState(null, "", "/about?app=settings");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await expect
      .element(page.getByRole("heading", { name: "Draco", exact: true }))
      .toBeVisible();
    expect(host.querySelector('[data-window="settings"]')).toBeNull();
  } finally {
    history.replaceState(null, "", original);
  }
});
