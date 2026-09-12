import { render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import { expect, test, vi } from "vitest";
import { Desktop } from "../../apps/desktop/src/features/desktop/desktop";
import { defaultSite } from "../../apps/desktop/src/features/site/model";
import "@workspace/theme";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);

test("unmounting during wallpaper preload clears timers and never installs late keyboard handlers", async () => {
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const decode = vi
    .spyOn(HTMLImageElement.prototype, "decode")
    .mockReturnValue(pending);
  const intervals = vi.spyOn(window, "setInterval");
  const clear = vi.spyOn(window, "clearInterval");
  const add = vi.spyOn(window, "addEventListener");
  const remove = vi.spyOn(window, "removeEventListener");
  const host = document.createElement("div");
  document.body.append(host);
  const view = await render(
    host,
    <Desktop initial={structuredClone(defaultSite)} />,
  );
  try {
    await expect.poll(() => decode.mock.calls.length).toBeGreaterThan(0);
    const clockCall = intervals.mock.calls.findIndex(
      (args) => args[1] === 1000,
    );
    expect(clockCall).toBeGreaterThanOrEqual(0);
    const clock = intervals.mock.results[clockCall]?.value;
    const resize = add.mock.calls.find(
      (args) =>
        args[0] === "resize" &&
        typeof args[1] === "function" &&
        args[1].name === "resize",
    )?.[1];
    expect(resize).toBeTypeOf("function");
    view.cleanup();
    // Qwik schedules visible-task destruction in its cleanup chore.
    await expect
      .poll(() => clear.mock.calls.some(([id]) => id === clock))
      .toBe(true);
    await expect
      .poll(() =>
        remove.mock.calls.some(
          ([name, listener]) => name === "resize" && listener === resize,
        ),
      )
      .toBe(true);
    const keysBefore = add.mock.calls.filter(
      (args) => args[0] === "keydown",
    ).length;
    release();
    await pending;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    expect(add.mock.calls.filter((args) => args[0] === "keydown")).toHaveLength(
      keysBefore,
    );
  } finally {
    release();
    view.cleanup();
    host.remove();
    vi.restoreAllMocks();
  }
});
