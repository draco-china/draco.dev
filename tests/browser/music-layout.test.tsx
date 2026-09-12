import { $, render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import type { AppHost } from "@workspace/app-sdk";
import Music from "@workspace/music";
import { emptyMusic } from "@workspace/music/model";
import { readMusic, saveMusic } from "@workspace/music/storage";
import { expect, test } from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import { Desktop } from "../../apps/desktop/src/features/desktop/desktop";
import { defaultSite } from "../../apps/desktop/src/features/site/model";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
const host: AppHost = {
  mode: "standalone",
  appearance: { theme: "light", accent: "blue", reducedMotion: true },
  visible: true,
  path: "/",
  openUrl$: $(() => {}),
  navigate$: $(() => {}),
  setTitle$: $(() => {}),
};
test("touch mini-player expands accessibly and resizing preserves the audio and search", async () => {
  const previousTheme = document.documentElement.dataset.theme;
  document.documentElement.dataset.theme = "dark";
  await page.viewport(390, 844);
  await commands.musicFixture(true);
  const saved = await readMusic();
  await saveMusic(emptyMusic());
  const container = document.createElement("div");
  container.style.height = "100dvh";
  document.body.append(container);
  let cleanup: (() => void) | undefined;
  try {
    cleanup = (
      await render(
        container,
        <Music
          host={host}
          catalogUrl="https://music-fixture.test/catalog.json"
        />,
      )
    ).cleanup;
    await page.getByLabelText("搜索歌曲").fill("保留搜索");
    await expect
      .element(
        page.getByRole("button", { name: "许嵩测试歌曲 许嵩 · 测试专辑" }),
      )
      .toBeVisible();
    const audio = container.querySelector("audio");
    const player = container.querySelector<HTMLElement>("[data-music-player]");
    if (!player || !audio) throw new Error("Music shell missing");
    expect(player.getBoundingClientRect().bottom).toBeLessThanOrEqual(845);
    expect(container.querySelector("aside")).toBeNull();
    expect(container.querySelector('nav[aria-label="音乐资料库"]')).toBeNull();
    await page.getByRole("button", { name: "展开播放器", exact: true }).click();
    await expect
      .element(page.getByRole("dialog", { name: "正在播放" }))
      .toBeVisible();
    expect(container.querySelectorAll("audio")).toHaveLength(1);
    expect(container.querySelector("audio")).toBe(audio);
    await expect
      .element(page.getByRole("combobox", { name: "播放模式" }))
      .toBeVisible();
    await page.getByRole("button", { name: "收起播放器", exact: true }).click();
    await expect.poll(() => container.querySelector("dialog")).toBeNull();
    await page.viewport(1100, 900);
    await expect
      .element(page.getByLabelText("搜索歌曲"))
      .toHaveValue("保留搜索");
    expect(container.querySelector("audio")).toBe(audio);
    await expect
      .element(page.getByRole("combobox", { name: "播放模式" }))
      .toBeVisible();
  } finally {
    if (previousTheme) document.documentElement.dataset.theme = previousTheme;
    else delete document.documentElement.dataset.theme;
    cleanup?.();
    container.remove();
    await saveMusic(saved);
    await commands.musicFixture(false);
  }
});

test("Escape dismisses the expanded player and keeps its desktop music window open", async () => {
  await page.viewport(1440, 1000);
  const previousVisit = localStorage.getItem("draco.visited");
  const previousUrl = location.href;
  localStorage.setItem("draco.visited", "1");
  history.replaceState(null, "", location.pathname);
  const container = document.createElement("div");
  document.body.append(container);
  let cleanup: (() => void) | undefined;
  try {
    cleanup = (
      await render(
        container,
        <Desktop initial={structuredClone(defaultSite)} />,
      )
    ).cleanup;
    await expect.element(page.getByLabelText("搜索关键词")).toBeVisible();
    await page
      .getByRole("button", { name: "音乐", exact: true })
      .last()
      .click();
    await page.getByRole("button", { name: "展开播放器", exact: true }).click();
    await expect
      .element(page.getByRole("dialog", { name: "正在播放" }))
      .toBeVisible();
    const frame = container.querySelector('[data-window="music"]');
    const audio = frame?.querySelector("audio");
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => container.querySelector("dialog")).toBeNull();
    expect(new URL(location.href).searchParams.get("app")).toBe("music");
    expect(container.querySelector('[data-window="music"]')).toBe(frame);
    expect(frame?.querySelector("audio")).toBe(audio);
    await expect
      .element(page.getByRole("button", { name: "展开播放器", exact: true }))
      .toBeVisible();
    expect(
      container
        .querySelector("[data-music-player]")
        ?.hasAttribute("aria-hidden"),
    ).toBe(false);
    await page.getByRole("button", { name: "展开播放器", exact: true }).click();
    await expect
      .element(page.getByRole("dialog", { name: "正在播放" }))
      .toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => container.querySelector("dialog")).toBeNull();
    expect(new URL(location.href).searchParams.get("app")).toBe("music");
  } finally {
    cleanup?.();
    container.remove();
    history.replaceState(null, "", previousUrl);
    if (previousVisit === null) localStorage.removeItem("draco.visited");
    else localStorage.setItem("draco.visited", previousVisit);
  }
});
