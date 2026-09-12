import { $, render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import type { AppHost } from "@workspace/app-sdk";
import Music from "@workspace/music";
import { emptyMusic } from "@workspace/music/model";
import { readMusic, saveMusic } from "@workspace/music/storage";
import { expect, test } from "vitest";
import { commands, page } from "vitest/browser";
import { MusicWidget } from "../../apps/desktop/src/features/desktop/widgets/music-widget";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
const openMusic = $(async () => {});
const host: AppHost = {
  mode: "standalone",
  appearance: { theme: "light", accent: "blue", reducedMotion: true },
  visible: true,
  path: "/",
  openUrl$: $(() => {}),
  navigate$: $(() => {}),
  setTitle$: $(() => {}),
};
test("simulated upstream drives native WAV playback, pause/progress and automatic playback of the restored queue", async () => {
  await page.viewport(1100, 900);
  await commands.musicFixture(true);
  const original = await readMusic();
  await saveMusic(emptyMusic());
  let container = document.createElement("div");
  container.style.height = "100dvh";
  document.body.append(container);
  let cleanup: (() => void) | undefined;
  try {
    cleanup = (
      await render(
        container,
        <>
          <MusicWidget open={openMusic} />
          <Music
            host={host}
            catalogUrl="https://music-fixture.test/catalog.json"
          />
        </>,
      )
    ).cleanup;
    await page.getByLabelText("搜索歌曲").fill("fixture");
    await page
      .getByRole("button", { name: "搜索", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Fixture song Generated · Test" })
      .click();
    const audio = container.querySelector("audio");
    if (!audio) throw new Error("Audio element missing");
    await expect.poll(() => audio.paused).toBe(false);
    await expect
      .poll(() => audio.currentTime, { timeout: 5000 })
      .toBeGreaterThan(0.2);
    expect(audio.duration).toBeCloseTo(12, 0);
    await expect
      .element(page.getByRole("button", { name: "暂停音乐", exact: true }))
      .toBeVisible();
    await page.getByRole("button", { name: "暂停音乐", exact: true }).click();
    await expect.poll(() => audio.paused).toBe(true);
    await page.getByRole("button", { name: "播放音乐", exact: true }).click();
    await expect.poll(() => audio.paused).toBe(false);
    expect(container.querySelectorAll("audio").length).toBe(1);
    const beforeRotation = audio.currentTime;
    await page.viewport(844, 390);
    expect(container.querySelector("audio")).toBe(audio);
    expect(audio.paused).toBe(false);
    await expect.poll(() => audio.currentTime).toBeGreaterThan(beforeRotation);
    await page.viewport(390, 844);
    await page.getByRole("button", { name: "展开播放器", exact: true }).click();
    await expect
      .element(page.getByText("Generated lyric", { exact: true }))
      .toBeVisible();
    await page.getByRole("button", { name: "暂停", exact: true }).click();
    if (!audio) throw new Error("Audio element missing");
    await expect.poll(() => audio.paused).toBe(true);
    await expect
      .poll(async () => (await readMusic()).progress)
      .toBeGreaterThan(0);
    const position = (await readMusic()).progress;
    await page.getByRole("button", { name: "收起播放器", exact: true }).click();
    cleanup();
    container.remove();
    container = document.createElement("div");
    container.style.height = "100dvh";
    document.body.append(container);
    cleanup = (
      await render(
        container,
        <>
          <MusicWidget open={openMusic} />
          <Music
            host={host}
            catalogUrl="https://music-fixture.test/catalog.json"
          />
        </>,
      )
    ).cleanup;
    await expect
      .element(
        page.getByRole("button", { name: "Fixture song Generated · Test" }),
      )
      .toBeVisible();
    const restored = container.querySelector("audio");
    if (!restored) throw new Error("Audio element missing");
    await expect.poll(() => restored.paused).toBe(false);
    await expect
      .poll(() => restored.currentTime)
      .toBeGreaterThanOrEqual(position);
    await page.getByRole("button", { name: "暂停", exact: true }).click();
    await page.getByLabelText("搜索歌曲").fill("Unavailable");
    await page
      .getByRole("button", { name: "搜索", exact: true })
      .first()
      .click();
    await expect
      .poll(() => container.querySelector("h2")?.textContent)
      .toContain("Unavailable");
    await page
      .getByRole("button", { name: "Unavailable song Generated · Test" })
      .click();
    await expect
      .poll(() => container.querySelector('[role="alert"]')?.textContent)
      .toContain("音频加载失败");
    expect(restored.paused).toBe(true);
    await page.getByLabelText("搜索歌曲").fill("不存在的歌");
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await expect
      .element(page.getByText("没有找到匹配的歌曲", { exact: true }))
      .toBeVisible();
  } finally {
    cleanup?.();
    container.remove();
    await saveMusic(original);
    await commands.musicFixture(false);
  }
}, 20000);

test("default playlist, previous/next, volume and repeat mode persist", async () => {
  await page.viewport(1100, 900);
  await commands.musicFixture(true);
  const original = await readMusic();
  await saveMusic(emptyMusic());
  const container = document.createElement("div");
  container.style.height = "100dvh";
  document.body.append(container);
  let cleanup: (() => void) | undefined;
  try {
    cleanup = (
      await render(
        container,
        <>
          <MusicWidget open={openMusic} />
          <Music
            host={host}
            catalogUrl="https://music-fixture.test/catalog.json"
          />
        </>,
      )
    ).cleanup;
    await page
      .getByRole("button", {
        name: "许嵩测试歌曲 许嵩 · 测试专辑",
        exact: true,
      })
      .click();
    await expect.poll(async () => (await readMusic()).recent[0]?.id).toBe(11);
    await page.getByRole("button", { name: "下一首音乐", exact: true }).click();
    await expect.poll(async () => (await readMusic()).recent[0]?.id).toBe(13);
    await page.getByRole("button", { name: "上一首音乐", exact: true }).click();
    await expect.poll(async () => (await readMusic()).index).toBe(0);
    await page.getByRole("combobox", { name: "播放模式" }).click();
    await page.getByRole("option", { name: "单曲循环" }).click();
    await expect.poll(async () => (await readMusic()).mode).toBe("repeat");
    const audio = container.querySelector("audio");
    if (!audio) throw new Error("Missing audio");
    const volume = container.querySelector<HTMLInputElement>(
      'input[type="range"][step="0.05"]',
    );
    if (!volume) throw new Error("Missing volume");
    volume.value = "0.25";
    volume.dispatchEvent(new Event("input", { bubbles: true }));
    await expect.poll(() => audio.volume).toBeCloseTo(0.25, 5);
    volume.dispatchEvent(new Event("change", { bubbles: true }));
    await expect.poll(async () => (await readMusic()).volume).toBe(0.25);
    const seek = container.querySelector<HTMLInputElement>(
      'input[aria-label="播放进度"]',
    );
    if (!seek) throw new Error("Missing player seek");
    seek.value = "4";
    seek.dispatchEvent(new Event("input", { bubbles: true }));
    await expect.poll(() => audio.currentTime).toBeGreaterThanOrEqual(4);
    await expect
      .poll(async () => (await readMusic()).progress)
      .toBeGreaterThanOrEqual(4);
    await expect
      .poll(() =>
        container.querySelector('[role="timer"]')?.textContent?.trim(),
      )
      .toMatch(/^00:0[4-9]$/);
    if ("mediaSession" in navigator)
      expect(navigator.mediaSession.metadata?.title).toBe("许嵩测试歌曲");
    await page.getByRole("button", { name: "暂停", exact: true }).click();
  } finally {
    cleanup?.();
    container.remove();
    await saveMusic(original);
    await commands.musicFixture(false);
  }
}, 20000);
