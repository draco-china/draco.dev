import type { AppDefinition } from "@workspace/app-sdk";
export const appRegistry = {
  code: {
    id: "code",
    name: "代码",
    icon: "code",
    desktop: true,
    dock: true,
    display: "browser",
    window: { width: 1100, height: 720 },
    lifecycle: "release-on-close",
    kind: "url",
    url: "https://github1s.com/draco-china/draco.dev",
    sandbox:
      "allow-scripts allow-same-origin allow-forms allow-popups allow-downloads",
  },
  about: {
    id: "about",
    name: "关于我",
    icon: "about",
    desktop: true,
    dock: true,
    display: "application",
    window: { width: 820, height: 600 },
    lifecycle: "release-on-close",
    kind: "module",
  },
  music: {
    id: "music",
    name: "音乐",
    icon: "music",
    desktop: true,
    dock: true,
    display: "application",
    window: { width: 1000, height: 700 },
    lifecycle: "background",
    kind: "module",
  },
  navigation: {
    id: "navigation",
    name: "应用导航",
    icon: "navigation",
    desktop: true,
    dock: true,
    display: "application",
    window: { width: 1100, height: 760 },
    lifecycle: "release-on-close",
    kind: "module",
  },
  tools: {
    id: "tools",
    name: "工具箱",
    icon: "tools",
    desktop: true,
    dock: true,
    display: "browser",
    window: { width: 820, height: 600 },
    lifecycle: "release-on-close",
    kind: "url",
    url: "https://tool.draco.dev",
    sandbox: "allow-scripts allow-same-origin allow-forms allow-popups",
  },
} satisfies Record<string, AppDefinition>;
export const systemApps = {
  browser: { name: "浏览器", icon: "browser", desktop: true, dock: true },
  settings: { name: "设置", icon: "settings", desktop: true, dock: true },
} as const;
export type RegisteredAppId =
  | keyof typeof appRegistry
  | keyof typeof systemApps;
export const appNames = Object.fromEntries(
  Object.entries({ ...appRegistry, ...systemApps }).map(([id, app]) => [
    id,
    app.name,
  ]),
) as Record<RegisteredAppId, string>;
const appOrder: RegisteredAppId[] = [
  "browser",
  "music",
  "navigation",
  "tools",
  "code",
  "about",
  "settings",
];
const allApps = { ...appRegistry, ...systemApps };
export const desktopApps = appOrder.filter((id) => allApps[id].desktop);
export const dockApps = appOrder.filter((id) => allApps[id].dock);
export function application(id: string): AppDefinition | undefined {
  return Object.hasOwn(appRegistry, id)
    ? appRegistry[id as keyof typeof appRegistry]
    : undefined;
}

export const browserSites = Object.values(appRegistry)
  .filter((app) => app.kind === "url" && app.display === "browser")
  .map((app) => {
    const site = app as Extract<AppDefinition, { kind: "url" }>;
    return { url: site.url, sandbox: site.sandbox, allow: site.allow };
  });
