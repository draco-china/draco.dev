import type { Settings, SiteData } from "../site/model";
import { appNames, type RegisteredAppId } from "./app-registry";

export { appNames };
export type AppId = RegisteredAppId;
export interface WindowState {
  id: AppId;
  width?: number;
  height?: number;
  x: number;
  y: number;
  minimized: boolean;
  maximized: boolean;
  z: number;
}
export interface DesktopState {
  site: SiteData;
  settings: Settings;
  overrides: Partial<Settings>;
  windows: WindowState[];
  active: AppId | "";

  phase: "boot" | "welcome" | "desktop";
  clock: string;
  date: string;

  desktop: boolean;
  notice: string;
}
export function isApp(v: string | null): v is AppId {
  return !!v && Object.hasOwn(appNames, v);
}
export function effectiveSettings(
  defaults: Settings,
  overrides: Partial<Settings>,
): Settings {
  return {
    ...defaults,
    ...overrides,
    wallpapers: defaults.wallpapers,
  };
}
export function clampWindow(x: number, y: number, w: number, h: number) {
  return {
    x: Math.max(0, Math.min(x, Math.max(0, w - 360))),
    y: Math.max(40, Math.min(y, Math.max(40, h - 140))),
  };
}
export function fitWindow(
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number,
  width = 820,
  height = 600,
) {
  const renderedWidth = Math.min(width, Math.max(0, viewportWidth - 48));
  const renderedHeight = Math.min(height, Math.max(0, viewportHeight - 150));
  return {
    x: Math.max(24, Math.min(x, viewportWidth - renderedWidth - 24)),
    y: Math.max(40, Math.min(y, viewportHeight - renderedHeight - 100)),
  };
}
