import { afterEach, beforeEach, vi } from "vitest";
import { commands } from "vitest/browser";

beforeEach(async () => {
  await commands.emptyMusicCatalog();
  vi.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
});
