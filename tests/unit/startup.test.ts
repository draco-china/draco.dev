import { expect, test, vi } from "vitest";
import { settleStartupResources } from "../../apps/desktop/src/features/desktop/startup";

test("startup progress follows resource completion rather than elapsed time", async () => {
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const update = vi.fn();
  const ready = settleStartupResources([Promise.resolve(), pending], update);
  await vi.waitFor(() => expect(update).toHaveBeenLastCalledWith(50));
  finish();
  await ready;
  expect(update.mock.calls.flat()).toEqual([0, 50, 100]);
});

test("failed and stalled resources release the startup screen", async () => {
  vi.useFakeTimers();
  try {
    const update = vi.fn();
    const ready = settleStartupResources(
      [Promise.reject(new Error("offline")), new Promise(() => {})],
      update,
    );
    await vi.advanceTimersByTimeAsync(8000);
    await ready;
    expect(update).toHaveBeenLastCalledWith(100);
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
