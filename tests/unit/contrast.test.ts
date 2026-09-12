import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// Convert OKLCH through OKLab to linear sRGB for WCAG relative luminance.
const luminance = (lightness: number, chroma: number, hue: number) => {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const blue = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return 0.2126 * r + 0.7152 * g + 0.0722 * blue;
};
test("all accent fills support normal-size white control text at 4.5:1", () => {
  const tokens = readFileSync("packages/theme/src/tokens.css", "utf8");
  const colors = [
    ...tokens.matchAll(/--palette-\w+: oklch\(([\d.]+) ([\d.]+) ([\d.]+)\);/g),
  ];
  expect(colors.length).toBe(8);
  for (const color of colors) {
    const [, l, c, h] = color;
    expect(
      1.05 / (luminance(Number(l), Number(c), Number(h)) + 0.05),
    ).toBeGreaterThanOrEqual(4.5);
  }
});
