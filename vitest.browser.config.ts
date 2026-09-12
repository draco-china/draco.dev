import { qwikVite } from "@qwik.dev/core/optimizer";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import { homeWheel } from "./tests/browser/home-commands.ts";
import {
  emptyMusicCatalog,
  musicFixture,
  releaseArtist,
} from "./tests/browser/music-commands.ts";
import {
  windowDrag,
  windowDragInterrupted,
  windowRelease,
} from "./tests/browser/window-commands.ts";
export default defineConfig({
  optimizeDeps: { include: ["zod"] },
  plugins: [
    qwikVite({ csr: true, srcDir: ".", devTools: { clickToSource: false } }),
    tailwindcss(),
  ],
  test: {
    name: "browser",
    setupFiles: ["./tests/browser/setup.ts"],
    // Firefox input is unreliable with parallel Browser Mode files.
    fileParallelism: false,
    testTimeout: 60_000,
    sequence: { groupOrder: 1 },
    expect: { poll: { timeout: 5000 } },
    include: ["tests/browser/**/*.test.tsx"],
    browser: {
      enabled: true,
      commands: {
        musicFixture,
        emptyMusicCatalog,
        releaseArtist,
        homeWheel,
        windowDrag,
        windowDragInterrupted,
        windowRelease,
      },
      headless: true,
      provider: playwright(),
      instances: [
        { browser: "chromium" },
        { browser: "firefox" },
        { browser: "webkit" },
      ],
    },
  },
});
