import { defaultSettings, type Settings, settingsSchema } from "../site/model";
export const PREFERENCES_KEY = "preferences.v2";
const preferenceSchema = settingsSchema.omit({ wallpapers: true }).partial();
export function normalizePreferences(
  raw: unknown,
  defaults: Settings = defaultSettings,
): Partial<Settings> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const values = raw as Record<string, unknown>;
  const result: Partial<Settings> = {};
  for (const key of Object.keys(
    preferenceSchema.shape,
  ) as (keyof typeof preferenceSchema.shape)[]) {
    const parsed = preferenceSchema.shape[key].safeParse(values[key]);
    if (parsed.success && parsed.data !== undefined)
      Object.assign(result, { [key]: parsed.data });
  }
  if (typeof values.wallpaper === "string") {
    const valid = [
      "alpine",
      "aurora",
      "dusk",
      "midnight",
      "sand",
      ...defaults.wallpapers.map((w) => w.id),
    ];
    result.wallpaper = valid.includes(values.wallpaper)
      ? values.wallpaper
      : "alpine";
  }
  return result;
}
export function readPreferences(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  defaults: Settings = defaultSettings,
): Partial<Settings> {
  const current = storage.getItem(PREFERENCES_KEY);
  if (current !== null) {
    try {
      const data = JSON.parse(current);
      return data?.version === 2
        ? normalizePreferences(data.overrides, defaults)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}
export function savePreferences(
  storage: Pick<Storage, "setItem">,
  overrides: Partial<Settings>,
): void {
  storage.setItem(PREFERENCES_KEY, JSON.stringify({ version: 2, overrides }));
}
export function resetPreferences(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(PREFERENCES_KEY);
}
