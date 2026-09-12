import { readPreferences } from "../settings/preferences";
import type { Settings } from "../site/model";
/** Called before client rendering so the first painted screen has the saved appearance. */
export function initializeAppearance(defaults: Settings) {
  let saved: Partial<Settings> = {};
  try {
    saved = readPreferences(localStorage, defaults);
  } catch {}
  const theme = ["system", "light", "dark"].includes(saved.theme || "")
    ? saved.theme
    : defaults.theme;
  const accent = [
    "blue",
    "purple",
    "pink",
    "red",
    "orange",
    "yellow",
    "green",
    "graphite",
  ].includes(saved.accent || "")
    ? saved.accent
    : defaults.accent;
  const motion = ["system", "full", "reduced"].includes(saved.motion || "")
    ? saved.motion
    : defaults.motion;
  document.documentElement.dataset.theme =
    theme === "system"
      ? matchMedia("(prefers-color-scheme:dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.dataset.accent = accent;
  document.documentElement.classList.toggle(
    "reduce-motion",
    motion === "reduced" ||
      (motion === "system" &&
        matchMedia("(prefers-reduced-motion:reduce)").matches),
  );
}
