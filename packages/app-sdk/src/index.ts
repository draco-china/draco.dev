import type { QRL } from "@qwik.dev/core";

export const APP_PROTOCOL = "draco.app";
export const APP_PROTOCOL_VERSION = 1;
export type Accent =
  | "blue"
  | "purple"
  | "pink"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "graphite";
export interface AppAppearance {
  theme: "light" | "dark";
  accent: Accent;
  reducedMotion: boolean;
}
export interface AppHost {
  mode: "desktop" | "standalone";
  appearance: AppAppearance;
  visible: boolean;
  path: string;
  openUrl$: QRL<(url: string) => void | Promise<void>>;
  navigate$: QRL<(path: string) => void | Promise<void>>;
  setTitle$: QRL<(title: string) => void | Promise<void>>;
}
export interface AppContentProps {
  host: AppHost;
}
interface AppRegistration {
  id: string;
  name: string;
  icon: string;
  desktop: boolean;
  dock: boolean;
  display: "application" | "browser";
  window: { width: number; height: number };
  lifecycle: "release-on-close" | "background";
}
export type AppDefinition = AppRegistration &
  (
    | { kind: "module" }
    | {
        kind: "url";
        url: string;
        sandbox: string;
        bridge?: boolean;
        allow?: string;
      }
  );
export type AppMessagePayload =
  | { type: "ready" }
  | { type: "appearance"; value: AppAppearance }
  | { type: "visibility"; visible: boolean }
  | { type: "title"; title: string }
  | { type: "path"; path: string }
  | { type: "open-url"; url: string };
export type AppMessage = AppMessagePayload & {
  protocol: typeof APP_PROTOCOL;
  version: typeof APP_PROTOCOL_VERSION;
  appId: string;
};
export function createAppMessage(
  appId: string,
  payload: AppMessagePayload,
): AppMessage {
  return {
    ...payload,
    protocol: APP_PROTOCOL,
    version: APP_PROTOCOL_VERSION,
    appId,
  };
}
const accents: readonly string[] = [
  "blue",
  "purple",
  "pink",
  "red",
  "orange",
  "yellow",
  "green",
  "graphite",
];
export function isSafeWebUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4096) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function isAppPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 4096 &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    [...value].every((character) => character.charCodeAt(0) >= 32)
  );
}
/** Call with the registered iframe window and the origin derived from its entry URL. */
export function readAppMessage(
  event: Pick<MessageEvent, "origin" | "source" | "data">,
  expected: { origin: string; source: MessageEventSource; appId: string },
): AppMessage | undefined {
  if (event.origin !== expected.origin || event.source !== expected.source)
    return;
  const value = event.data;
  if (
    !value ||
    typeof value !== "object" ||
    value.protocol !== APP_PROTOCOL ||
    value.version !== APP_PROTOCOL_VERSION ||
    value.appId !== expected.appId
  )
    return;
  switch (value.type) {
    case "ready":
      return createAppMessage(expected.appId, { type: "ready" });
    case "appearance": {
      const a = value.value;
      if (
        a &&
        (a.theme === "light" || a.theme === "dark") &&
        accents.includes(a.accent) &&
        typeof a.reducedMotion === "boolean"
      )
        return createAppMessage(expected.appId, {
          type: "appearance",
          value: {
            theme: a.theme,
            accent: a.accent,
            reducedMotion: a.reducedMotion,
          },
        });
      return;
    }
    case "visibility":
      if (typeof value.visible === "boolean")
        return createAppMessage(expected.appId, {
          type: "visibility",
          visible: value.visible,
        });
      return;
    case "title":
      if (typeof value.title === "string" && value.title.length <= 100)
        return createAppMessage(expected.appId, {
          type: "title",
          title: value.title,
        });
      return;
    case "path":
      if (isAppPath(value.path))
        return createAppMessage(expected.appId, {
          type: "path",
          path: value.path,
        });
      return;
    case "open-url":
      if (isSafeWebUrl(value.url))
        return createAppMessage(expected.appId, {
          type: "open-url",
          url: value.url,
        });
      return;
  }
}
