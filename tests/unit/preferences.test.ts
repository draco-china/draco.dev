import { expect, test } from "vitest";
import {
  normalizePreferences,
  PREFERENCES_KEY,
  readPreferences,
  resetPreferences,
} from "../../apps/desktop/src/features/settings/preferences";

function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
test("current overrides normalize field by field and reset cleanly", () => {
  const local = storage();
  local.setItem(
    PREFERENCES_KEY,
    JSON.stringify({
      version: 2,
      overrides: {
        theme: "dark",
        accent: "invalid",
        engine: "bing",
        wallpaper: "/media/deleted.png",
      },
    }),
  );
  expect(readPreferences(local)).toEqual({
    theme: "dark",
    engine: "bing",
    wallpaper: "alpine",
  });
  resetPreferences(local);
  expect(local.values.size).toBe(0);
  expect(readPreferences(local)).toEqual({});
});
test("unknown versions and malformed data fall back safely", () => {
  const local = storage();
  local.setItem(PREFERENCES_KEY, "broken");
  expect(readPreferences(local)).toEqual({});
  local.setItem(
    PREFERENCES_KEY,
    JSON.stringify({ version: 99, overrides: { theme: "dark" } }),
  );
  expect(readPreferences(local)).toEqual({});
  expect(normalizePreferences(["dark"])).toEqual({});
});
