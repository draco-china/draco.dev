import { describe, expect, it } from "vitest";
import { nextIndex, parseLyrics, validMusic } from "./model";

describe("music data", () => {
  it("sorts repeated lyric timestamps", () => {
    expect(parseLyrics("[00:12.50][00:02.00]hello\n[ar:someone]")).toEqual([
      { time: 2, text: "hello" },
      { time: 12.5, text: "hello" },
    ]);
  });
  it("avoids current song when shuffling and clamps restored values", () => {
    expect(nextIndex(1, 3, "shuffle", 0)).toBe(2);
    expect(nextIndex(2, 3, "sequence")).toBe(0);
    expect(
      validMusic({ volume: 8, queue: [], index: 90, progress: NaN }),
    ).toMatchObject({ volume: 1, index: 0, progress: 0 });
  });
});

it("repeat and shuffle queue boundaries select valid indices", () => {
  expect(nextIndex(1, 3, "repeat")).toBe(1);
  expect(nextIndex(0, 0, "sequence")).toBe(0);
  expect(nextIndex(0, 1, "shuffle", 0.9)).toBe(0);
  for (const random of [0, 0.5, 0.999999, 1]) {
    const next = nextIndex(1, 3, "shuffle", random);
    expect(next).toBeGreaterThanOrEqual(0);
    expect(next).toBeLessThan(3);
    expect(next).not.toBe(1);
  }
});
