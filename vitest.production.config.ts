import { defineConfig, mergeConfig } from "vitest/config";
import { inspectBuiltApp } from "./tests/production/commands";
import browserConfig from "./vitest.browser.config";

const production = mergeConfig(browserConfig, defineConfig({}));
export default defineConfig({
  ...production,
  test: {
    ...production.test,
    name: "production",
    setupFiles: [],
    include: ["tests/production/**/*.test.tsx"],
    browser: {
      ...production.test?.browser,
      commands: { inspectBuiltApp },
    },
  },
});
