import {
  createAppMessage,
  isAppPath,
  isSafeWebUrl,
  readAppMessage,
} from "@workspace/app-sdk";
import { describe, expect, it } from "vitest";

describe("embedded application boundary", () => {
  const source = {} as Window;
  const expected = {
    origin: "https://music.draco.dev",
    source,
    appId: "music",
  };
  const message = createAppMessage("music", {
    type: "open-url",
    url: "https://tool.draco.dev",
  });
  it("accepts only the registered window and origin", () => {
    expect(readAppMessage({ ...expected, data: message }, expected)).toEqual(
      message,
    );
    expect(
      readAppMessage(
        { origin: "https://other.example", source, data: message },
        expected,
      ),
    ).toBeUndefined();
    expect(
      readAppMessage(
        { origin: expected.origin, source: {} as Window, data: message },
        expected,
      ),
    ).toBeUndefined();
  });
  it("rejects mismatched applications, versions and invalid payloads", () => {
    for (const data of [
      null,
      { ...message, version: 2 },
      { ...message, appId: "about" },
      { ...message, url: "javascript:alert(1)" },
      { ...message, type: "visibility", visible: "true" },
    ]) {
      expect(
        readAppMessage({ origin: expected.origin, source, data }, expected),
      ).toBeUndefined();
    }
  });
  it("keeps app paths local and navigation URLs explicit", () => {
    expect(isAppPath("/playlist/123?q=中文")).toBe(true);
    for (const path of [
      "//example.com",
      "/\\example.com",
      "/\nexample.com",
      "https://example.com",
    ])
      expect(isAppPath(path)).toBe(false);
    expect(isSafeWebUrl("https://tool.draco.dev/?q=中文")).toBe(true);
    expect(isSafeWebUrl("https://user:password@example.com")).toBe(false);
  });
});
