import { describe, expect, it } from "vitest";
import { selectViewportRegion } from "../../apps/desktop/src/features/desktop/viewport";

describe("hardware viewport segments", () => {
  it("falls back for ordinary and unsupported viewports", () => {
    expect(selectViewportRegion(800, 600)).toBeNull();
    expect(
      selectViewportRegion(800, 600, [
        { left: 0, top: 0, width: 800, height: 600 },
      ]),
    ).toBeNull();
  });
  it("uses the full canvas for continuous horizontal and vertical folds", () => {
    expect(
      selectViewportRegion(1100, 800, [
        { left: 0, top: 0, width: 550, height: 800 },
        { left: 550, top: 0, width: 550, height: 800 },
      ]),
    ).toBeNull();
    expect(
      selectViewportRegion(800, 1100, [
        { left: 0, top: 0, width: 800, height: 550 },
        { left: 0, top: 550, width: 800, height: 550 },
      ]),
    ).toBeNull();
  });
  it("does not mistake overlapping segment reports for an occluding hinge", () => {
    expect(
      selectViewportRegion(800, 600, [
        { left: 0, top: 0, width: 450, height: 600 },
        { left: 400, top: 0, width: 400, height: 600 },
      ]),
    ).toBeNull();
  });
  it("keeps controls left of a vertical hinge", () => {
    expect(
      selectViewportRegion(1100, 800, [
        { left: 570, top: 0, width: 530, height: 800 },
        { left: 0, top: 0, width: 530, height: 800 },
      ]),
    ).toEqual({ left: 0, top: 0, width: 530, height: 800 });
  });
  it("selects a whole top segment on rotation", () => {
    expect(
      selectViewportRegion(800, 1100, [
        { left: 0, top: 0, width: 800, height: 530 },
        { left: 0, top: 570, width: 800, height: 530 },
      ]),
    ).toEqual({ left: 0, top: 0, width: 800, height: 530 });
  });
  it("clips offscreen regions and ignores invalid dimensions", () => {
    expect(
      selectViewportRegion(800, 600, [
        { left: 0, top: 0, width: NaN, height: 600 },
        { left: 420, top: 0, width: 500, height: 700 },
      ]),
    ).toEqual({ left: 420, top: 0, width: 380, height: 600 });
  });
});
