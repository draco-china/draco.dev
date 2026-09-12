import { expect, test } from "vitest";
import { commands, page } from "vitest/browser";

for (const extension of ["mp3", "m4a", "flac"]) {
  test(`imported ${extension} audio decodes, plays, seeks and pauses`, async () => {
    await commands.musicFixture(false);
    const response = await fetch("/music/catalog.json");
    expect(response.ok).toBe(true);
    const catalog = await response.json();
    const song = catalog.songs.find((entry: { src: string }) =>
      entry.src.endsWith(`.${extension}`),
    );
    expect(song, `Missing imported ${extension} sample`).toBeDefined();
    const audio = document.createElement("audio");
    audio.muted = true;
    audio.preload = "metadata";
    const button = document.createElement("button");
    button.textContent = "播放实际音频";
    let playback: Promise<void> | undefined;
    button.onclick = () => {
      playback = audio.play();
    };
    document.body.append(audio, button);
    try {
      audio.src = song.src;
      await expect.poll(() => audio.readyState).toBeGreaterThanOrEqual(1);
      expect(audio.error).toBeNull();
      expect(Math.abs(audio.duration - song.duration)).toBeLessThan(2);
      await page.getByRole("button", { name: "播放实际音频" }).click();
      await playback;
      await expect.poll(() => audio.currentTime).toBeGreaterThan(0.1);
      audio.currentTime = 10;
      await expect.poll(() => audio.currentTime).toBeGreaterThanOrEqual(10);
      await expect
        .poll(() => !audio.seeking && audio.readyState >= 2)
        .toBe(true);
      expect(audio.error).toBeNull();
      audio.pause();
      expect(audio.paused).toBe(true);
    } finally {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.remove();
      button.remove();
    }
  });
}
