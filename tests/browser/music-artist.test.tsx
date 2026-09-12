import { $, render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import type { AppHost } from "@workspace/app-sdk";
import Music from "@workspace/music";
import { emptyMusic } from "@workspace/music/model";
import { readMusic, saveMusic } from "@workspace/music/storage";
import { expect, test, vi } from "vitest";
import { commands, page } from "vitest/browser";
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
test("default artist playlist loads and attempts playback while refresh preserves search and queue", async () => {
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
    await expect
      .element(
        page.getByRole("button", { name: "许嵩测试歌曲 许嵩 · 测试专辑" }),
      )
      .toBeVisible();
    const audio = container.querySelector("audio");
    if (!audio) throw new Error("Missing audio");
    await expect
      .poll(
        () =>
          !audio.paused ||
          container
            .querySelector('[role="alert"]')
            ?.textContent?.includes("点击播放，开始聆听"),
      )
      .toBe(true);
    if (audio.paused)
      await page.getByRole("button", { name: "播放", exact: true }).click();
    await expect.poll(() => audio.paused).toBe(false);
    await expect.poll(async () => (await readMusic()).queue[0]?.id).toBe(11);
    await page.getByLabelText("搜索歌曲").fill("fixture");
    await page
      .getByRole("button", { name: "搜索", exact: true })
      .first()
      .click();
    await expect
      .element(
        page.getByRole("button", { name: "Fixture song Generated · Test" }),
      )
      .toBeVisible();
    expect((await readMusic()).queue[0]?.id).toBe(11);
    await page.getByLabelText("搜索歌曲").fill("");
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await page.getByRole("button", { name: "刷新", exact: true }).click();
    await expect
      .element(page.getByRole("button", { name: "刷新", exact: true }))
      .toBeEnabled();
    expect((await readMusic()).queue[0]?.id).toBe(11);
    await page
      .getByRole("button", { name: "搜索", exact: true })
      .last()
      .click();
    await expect
      .element(
        page.getByRole("button", { name: "Fixture song Generated · Test" }),
      )
      .toBeVisible();
  } finally {
    cleanup?.();
    container.remove();
    await saveMusic(saved);
    await commands.musicFixture(false);
  }
});

test("artist failure offers retry without blocking search", async () => {
  await commands.musicFixture(true, true);
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
    await expect
      .poll(() => container.textContent)
      .toContain("音乐目录暂时无法加载");
    await expect
      .element(page.getByRole("button", { name: "重试", exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "搜索", exact: true }).first())
      .toBeEnabled();
    await page.getByRole("button", { name: "重试", exact: true }).click();
    await expect
      .element(
        page.getByRole("button", { name: "许嵩测试歌曲 许嵩 · 测试专辑" }),
      )
      .toBeVisible();
    await expect
      .poll(() => container.querySelector("audio")?.paused)
      .toBe(false);
  } finally {
    cleanup?.();
    container.remove();
    await commands.musicFixture(false);
  }
});

test("blocked automatic playback presents an explicit play action", async () => {
  await commands.musicFixture(true);
  const saved = await readMusic();
  await saveMusic(emptyMusic());
  const nativePlay = HTMLMediaElement.prototype.play;
  const play = vi
    .spyOn(HTMLMediaElement.prototype, "play")
    .mockImplementationOnce(() =>
      Promise.reject(new DOMException("Gesture required", "NotAllowedError")),
    )
    .mockImplementation(function (this: HTMLMediaElement) {
      return nativePlay.call(this);
    });
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
    await expect
      .poll(() => container.querySelector('[role="alert"]')?.textContent)
      .toContain("点击播放，开始聆听");
    expect(play).toHaveBeenCalledTimes(1);
    await page.getByRole("button", { name: "播放", exact: true }).click();
    await expect
      .poll(() => container.querySelector("audio")?.paused)
      .toBe(false);
  } finally {
    cleanup?.();
    container.remove();
    play.mockRestore();
    await saveMusic(saved);
    await commands.musicFixture(false);
  }
});

test("a late artist response preserves the manually paused saved queue", async () => {
  await commands.musicFixture(true);
  const saved = await readMusic();
  await saveMusic({
    ...emptyMusic(),
    queue: [
      {
        id: 1,
        title: "Saved song",
        artists: "Generated",
        album: "Test",
        cover: "",
        duration: 12,
      },
    ],
  });
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
    const audio = container.querySelector("audio");
    if (!audio) throw new Error("Missing audio");
    await expect
      .poll(
        () =>
          !audio.paused ||
          container
            .querySelector('[role="alert"]')
            ?.textContent?.includes("点击播放，开始聆听"),
      )
      .toBe(true);
    if (audio.paused)
      await page.getByRole("button", { name: "播放", exact: true }).click();
    await expect.poll(() => audio.currentTime).toBeGreaterThan(0.2);
    await commands.musicFixture(true, false, true);
    await page.getByRole("button", { name: "刷新", exact: true }).click();
    await page.getByRole("button", { name: "暂停", exact: true }).click();
    await expect.poll(() => audio.paused).toBe(true);
    await expect
      .poll(async () => (await readMusic()).progress)
      .toBeGreaterThan(0);
    await commands.releaseArtist();
    await expect
      .element(
        page.getByRole("button", { name: "许嵩测试歌曲 许嵩 · 测试专辑" }),
      )
      .toBeVisible();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    expect(audio.paused).toBe(true);
    expect((await readMusic()).queue[0]?.id).toBe(1);
  } finally {
    cleanup?.();
    container.remove();
    await saveMusic(saved);
    await commands.musicFixture(false);
  }
});
