import { expect, it } from "vitest";
import {
  addressUrl,
  move,
  visit,
} from "../../apps/desktop/src/features/browser/navigation";

it("branches browsing history after returning and bounds navigation", () => {
  const first = { entries: ["a", "b", "c"], index: 2 };
  expect(visit(move(first, -1), "d")).toEqual({
    entries: ["a", "b", "d"],
    index: 2,
  });
  expect(move({ entries: ["a"], index: 0 }, -1).index).toBe(0);
  expect(move(first, 1).index).toBe(2);
});
it("normalizes HTTPS addresses and safely encodes searches", () => {
  expect(addressUrl("tool.draco.dev")).toBe("https://tool.draco.dev/");
  expect(addressUrl("中文 & AI", "bing")).toBe(
    "https://www.bing.com/search?q=%E4%B8%AD%E6%96%87%20%26%20AI",
  );
  for (const input of [
    "javascript:alert(1)",
    "data:text/html,x",
    "https://u:p@example.com",
    " ",
  ])
    expect(addressUrl(input)).toBeUndefined();
});
