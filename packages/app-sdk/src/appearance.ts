import type { Accent, AppAppearance } from "./index";

export function readStandaloneAppearance(): AppAppearance {
  if (typeof window === "undefined")
    return { theme: "light", accent: "blue", reducedMotion: false };
  let preferences: { theme?: string; accent?: string; motion?: string } = {};
  try {
    const current = localStorage.getItem("preferences.v2");
    if (current !== null) {
      const envelope = JSON.parse(current);
      if (
        envelope?.version === 2 &&
        envelope.overrides &&
        typeof envelope.overrides === "object" &&
        !Array.isArray(envelope.overrides)
      )
        preferences = envelope.overrides;
    }
  } catch {}
  const accents = [
    "blue",
    "purple",
    "pink",
    "red",
    "orange",
    "yellow",
    "green",
    "graphite",
  ];
  return {
    theme:
      preferences.theme === "dark" || preferences.theme === "light"
        ? preferences.theme
        : matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
    accent: accents.includes(preferences.accent || "")
      ? (preferences.accent as Accent)
      : "blue",
    reducedMotion:
      preferences.motion === "reduced" ||
      (preferences.motion !== "full" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches),
  };
}

export function applyAppAppearance(appearance: AppAppearance) {
  document.documentElement.dataset.theme = appearance.theme;
  document.documentElement.dataset.accent = appearance.accent;
  document.documentElement.classList.toggle(
    "reduce-motion",
    appearance.reducedMotion,
  );
}

/** Run before rendering an independent entry; the bridge can replace it after its handshake. */
export function initializeStandaloneAppearance() {
  applyAppAppearance(readStandaloneAppearance());
}
