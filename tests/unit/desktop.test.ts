import { expect, test } from "vitest";
import {
  clampWindow,
  effectiveSettings,
  fitWindow,
  isApp,
} from "../../apps/desktop/src/features/desktop/state";
import {
  defaultSettings,
  searchUrl,
  settingsSchema,
} from "../../apps/desktop/src/features/site/model";

test("local overrides follow new defaults only for untouched fields", () => {
  const defaults = {
    ...defaultSettings,
    accent: "purple" as const,
    engine: "bing" as const,
  };
  const effective = effectiveSettings(defaults, { accent: "green" });
  expect(effective.accent).toBe("green");
  expect(effective.engine).toBe("bing");
  expect(effectiveSettings(defaults, {})).toEqual(defaults);
});
test("search encodes Chinese and query separators", () => {
  expect(searchUrl("google", "你好 & x=1")).toBe(
    "https://www.google.com/search?q=%E4%BD%A0%E5%A5%BD%20%26%20x%3D1",
  );
});
test("window positions remain reachable after display change", () => {
  expect(clampWindow(1900, 1000, 390, 844)).toEqual({ x: 30, y: 704 });
  expect(clampWindow(-80, -90, 1440, 900)).toEqual({ x: 0, y: 40 });
});
test("local preference validation rejects executable links and unexpected app names", () => {
  expect(
    settingsSchema.safeParse({
      ...defaultSettings,
      wallpapers: [{ id: "x", name: "x", url: "javascript:alert(1)" }],
    }).success,
  ).toBe(false);
  expect(isApp("about")).toBe(true);
  expect(isApp("account")).toBe(false);
  expect(isApp("constructor")).toBe(false);
});

test("restored windows fit their full app dimensions inside a smaller display", () => {
  expect(fitWindow(355, 218, 1280, 720, 1100, 760)).toEqual({ x: 156, y: 50 });
  expect(fitWindow(1900, 1000, 1024, 768, 1100, 760)).toEqual({ x: 24, y: 50 });
  expect(fitWindow(-80, -90, 1440, 900)).toEqual({ x: 24, y: 40 });
});
