import { render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { emptyMusic } from "@workspace/music/model";
import { readMusic, saveMusic } from "@workspace/music/storage";
import { expect, test, vi } from "vitest";
import { commands, page } from "vitest/browser";
import { Desktop } from "../../apps/desktop/src/features/desktop/desktop";
import { defaultSite } from "../../apps/desktop/src/features/site/model";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
for (const firstVisit of [true, false])
  test(`${firstVisit ? "first visit" : "returning desktop"} prepares music in the background and reuses its audio when opened`, async () => {
    await page.viewport(1440, 1000);
    await commands.musicFixture(true);
    const previousVisit = localStorage.getItem("draco.visited"),
      previousUrl = location.href,
      saved = await readMusic();
    await saveMusic(emptyMusic());
    const random = vi.spyOn(Math, "random").mockReturnValue(0.3);
    history.replaceState(null, "", location.pathname);
    if (firstVisit) localStorage.removeItem("draco.visited");
    else localStorage.setItem("draco.visited", "1");
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
      await expect.poll(() => play.mock.calls.length).toBeGreaterThan(0);
      await expect
        .element(page.getByRole("button", { name: "播放音乐", exact: true }))
        .toBeVisible();
      await expect
        .poll(
          () =>
            container.querySelector('[aria-label="音乐小组件"]')?.textContent,
        )
        .toContain("许嵩第二首");
      const frame = container.querySelector<HTMLElement>(
        '[data-window="music"]',
      );
      const audio = frame?.querySelector("audio");
      expect(frame?.style.display).toBe("none");
      expect(new URL(location.href).searchParams.get("app")).toBeNull();
      expect(container.querySelectorAll("audio")).toHaveLength(1);
      await page.getByRole("button", { name: "播放音乐", exact: true }).click();
      await expect.poll(() => audio?.paused).toBe(false);
      expect(new URL(location.href).searchParams.get("app")).toBeNull();
      await page.getByRole("button", { name: "暂停音乐", exact: true }).click();
      await expect.poll(() => audio?.paused).toBe(true);
      expect(frame?.style.display).toBe("none");
      await page
        .getByRole("button", { name: "打开音乐", exact: true })
        .click({ position: { x: 10, y: 10 } });
      await expect.element(page.getByLabelText("搜索歌曲")).toBeVisible();
      expect(container.querySelector('[data-window="music"]')).toBe(frame);
      expect(frame?.querySelector("audio")).toBe(audio);
      expect(container.querySelectorAll("audio")).toHaveLength(1);
    } finally {
      cleanup?.();
      container.remove();
      play.mockRestore();
      random.mockRestore();
      await saveMusic(saved);
      await commands.musicFixture(false);
      history.replaceState(null, "", previousUrl);
      if (previousVisit === null) localStorage.removeItem("draco.visited");
      else localStorage.setItem("draco.visited", previousVisit);
    }
  });
