import { component$, render } from "@qwik.dev/core";
import { QWIK_LOADER } from "@qwik.dev/core/loader";
import type { AppContentProps } from "@workspace/app-sdk";
import { initializeStandaloneAppearance } from "@workspace/app-sdk/appearance";
import { StandaloneApp } from "@workspace/app-sdk/standalone";
import { afterEach, expect, test, vi } from "vitest";

const loader = document.createElement("script");
loader.textContent = QWIK_LOADER;
document.head.append(loader);
const Fixture = component$<AppContentProps>(({ host }) => (
  <output>{JSON.stringify(host.appearance)}</output>
));
let container: HTMLDivElement;
let cleanup: (() => void) | undefined;
const storage = window.localStorage;
const oldV2 = storage.getItem("preferences.v2");
afterEach(() => {
  cleanup?.();
  container?.remove();
  vi.restoreAllMocks();
  for (const [key, value] of [["preferences.v2", oldV2]]) {
    if (value === null) storage.removeItem(key as string);
    else storage.setItem(key as string, value as string);
  }
});
async function mount() {
  container = document.createElement("div");
  document.body.append(container);
  cleanup = (
    await render(
      container,
      <StandaloneApp
        app={Fixture}
        appId="preference-fixture"
        title="Preferences"
      />,
    )
  ).cleanup;
}
const appearance = () =>
  JSON.parse(container.querySelector("output")?.textContent || "{}");

test("independent entry initializes before render and follows live system appearance", async () => {
  storage.setItem(
    "preferences.v2",
    JSON.stringify({
      version: 2,
      overrides: { theme: "system", accent: "orange", motion: "system" },
    }),
  );
  const dark = Object.assign(new EventTarget(), {
    matches: true,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addListener() {},
    removeListener() {},
  });
  const reduced = Object.assign(new EventTarget(), {
    matches: true,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addListener() {},
    removeListener() {},
  });
  const original = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query) =>
    query === dark.media
      ? dark
      : query === reduced.media
        ? reduced
        : original(query),
  );
  initializeStandaloneAppearance();
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(document.documentElement.dataset.accent).toBe("orange");
  expect(document.documentElement.classList.contains("reduce-motion")).toBe(
    true,
  );
  await mount();
  await expect
    .poll(appearance)
    .toEqual({ theme: "dark", accent: "orange", reducedMotion: true });
  dark.matches = false;
  reduced.matches = false;
  dark.dispatchEvent(new Event("change"));
  reduced.dispatchEvent(new Event("change"));
  await expect
    .poll(appearance)
    .toEqual({ theme: "light", accent: "orange", reducedMotion: false });
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(document.documentElement.classList.contains("reduce-motion")).toBe(
    false,
  );
  storage.setItem(
    "preferences.v2",
    JSON.stringify({
      version: 2,
      overrides: { theme: "dark", motion: "full" },
    }),
  );
  window.dispatchEvent(new StorageEvent("storage", { key: "preferences.v2" }));
  await expect
    .poll(appearance)
    .toEqual({ theme: "dark", accent: "blue", reducedMotion: false });
  reduced.matches = true;
  reduced.dispatchEvent(new Event("change"));
  expect(document.documentElement.classList.contains("reduce-motion")).toBe(
    false,
  );
});

test("standalone restores preferences and reacts to storage changes", async () => {
  storage.setItem(
    "preferences.v2",
    JSON.stringify({
      version: 2,
      overrides: { theme: "dark", accent: "purple", motion: "reduced" },
    }),
  );
  await mount();
  await expect
    .poll(appearance)
    .toEqual({ theme: "dark", accent: "purple", reducedMotion: true });
  expect(document.documentElement.classList.contains("reduce-motion")).toBe(
    true,
  );
  storage.setItem(
    "preferences.v2",
    JSON.stringify({
      version: 2,
      overrides: { theme: "light", accent: "green", motion: "full" },
    }),
  );
  window.dispatchEvent(new StorageEvent("storage", { key: "preferences.v2" }));
  await expect
    .poll(appearance)
    .toEqual({ theme: "light", accent: "green", reducedMotion: false });
});

test("standalone uses defaults when preferences are absent and rejects unknown versions", async () => {
  storage.removeItem("preferences.v2");
  await mount();
  await expect.poll(appearance).toEqual({
    theme: matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
    accent: "blue",
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
  storage.setItem(
    "preferences.v2",
    JSON.stringify({
      version: 99,
      overrides: { theme: "dark", accent: "red" },
    }),
  );
  window.dispatchEvent(new StorageEvent("storage"));
  await expect.poll(appearance).toEqual({
    theme: matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
    accent: "blue",
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
});

test("standalone falls back to system appearance when storage access throws", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("Denied", "SecurityError");
  });
  await mount();
  await expect.poll(appearance).toEqual({
    theme: matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
    accent: "blue",
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
});
