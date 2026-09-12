import {
  $,
  component$,
  type QRL,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@qwik.dev/core";
import type { AppAppearance } from "@workspace/app-sdk";
import type { NavigationLibrary } from "@workspace/navigation/library";
import { Icon } from "@workspace/ui/icon";
import { BrowserApp } from "../browser/browser-app";
import {
  readPreferences,
  resetPreferences,
  savePreferences,
} from "../settings/preferences";
import { SettingsApp } from "../settings/settings-app";
import type { Settings, SiteData } from "../site/model";
import { application, browserSites } from "./app-registry";
import { BootScreen } from "./boot-screen";
import { DesktopHome } from "./desktop-home";
import { Dock } from "./dock";
import { ModuleApp } from "./module-app";
import { animateWindow, focusDock, focusWindow } from "./motion";
import { settleStartupResources } from "./startup";
import {
  type AppId,
  clampWindow,
  type DesktopState,
  effectiveSettings,
  fitWindow,
  isApp,
} from "./state";
import { SystemMenuBar } from "./system-menu-bar";
import { updateViewportRegion } from "./viewport";
import { Wallpaper } from "./wallpaper";
import { WelcomeScreen } from "./welcome-screen";
import { WindowFrame } from "./window-frame";

export const Desktop = component$<{
  initial: SiteData;
  initialApp?: string;
  navigationLibrary?: NavigationLibrary;
  onNavigate$?: QRL<(url: string, replace: boolean) => Promise<void>>;
}>(({ initial, initialApp = "", onNavigate$, navigationLibrary }) => {
  const publicApp =
    ["about", "music", "navigation"].includes(initialApp) && isApp(initialApp)
      ? initialApp
      : "";
  const paths = useStore<Record<string, string>>({});
  const titles = useStore<Record<string, string>>({});
  const appearance = useStore<AppAppearance>({
    theme: "light",
    accent: "blue",
    reducedMotion: false,
  });
  const query = useSignal("");
  const searchInput = useSignal<HTMLInputElement>();
  const s = useStore<DesktopState>({
    site: initial,
    settings: initial.settings,
    overrides: {},
    windows: publicApp
      ? [
          {
            id: publicApp,
            ...application(publicApp)?.window,
            x: 24,
            y: 60,
            z: 1,
            minimized: false,
            maximized: false,
          },
        ]
      : [],
    active: publicApp,

    phase: publicApp ? "desktop" : "boot",
    clock: "",
    date: "",

    desktop: false,
    notice: "",
  });
  const intents = useStore<Partial<Record<AppId, number>>>({});
  const geometry = useStore<
    Record<string, { x: number; y: number; maximized: boolean }>
  >({});
  const sessionChecked = useSignal(false);
  const progress = useSignal(0);
  const updateUrl = $(async (id: AppId | "", replace = false) => {
    const url = new URL(window.location.href);
    if (onNavigate$)
      url.pathname = ["about", "music", "navigation"].includes(id)
        ? `/${id}`
        : "/";
    if (id && (!onNavigate$ || !["about", "music", "navigation"].includes(id)))
      url.searchParams.set("app", id);
    else url.searchParams.delete("app");
    if (id && paths[id]) url.searchParams.set("path", paths[id]);
    else url.searchParams.delete("path");
    if (url.href !== window.location.href) {
      if (onNavigate$) await onNavigate$(url.pathname + url.search, replace);
      else history[replace ? "replaceState" : "pushState"]({}, "", url);
    }
  });
  useVisibleTask$(
    ({ track }) => {
      const phase = track(() => s.phase);
      if (
        phase !== "desktop" ||
        application("music")?.kind !== "module" ||
        s.windows.some((window) => window.id === "music")
      )
        return;
      s.windows.push({
        id: "music",
        ...application("music")?.window,
        x: Math.max(24, (innerWidth - 820) / 2),
        y: Math.max(60, (innerHeight - 600) / 2),
        minimized: true,
        maximized: false,
        z: 0,
      });
    },
    { strategy: "document-ready" },
  );
  const open = $(async (id: AppId, stamp = performance.now()) => {
    const entry = application(id);
    if (entry?.kind === "url" && entry.display === "browser") {
      paths.browser = `/?url=${encodeURIComponent(entry.url)}`;
      id = "browser";
    }
    if (stamp < (intents[id] ?? 0)) return;
    intents[id] = stamp;
    let w = s.windows.find((w) => w.id === id);
    const kind = w?.minimized ? "restore" : "open";
    const z = Math.max(0, ...s.windows.map((w) => w.z)) + 1;
    if (!w) {
      const offset =
        s.windows.filter((window) => !window.minimized).length * 24;
      w = {
        id,
        ...application(id)?.window,
        x: Math.max(24, (window.innerWidth - 820) / 2) + offset,
        y: Math.max(60, (window.innerHeight - 600) / 2) + offset,
        minimized: false,
        maximized: false,
        z,
      };
      if (geometry[id])
        Object.assign(
          w,
          geometry[id],
          fitWindow(
            geometry[id].x,
            geometry[id].y,
            innerWidth,
            innerHeight,
            w.width,
            w.height,
          ),
        );
      Object.assign(
        w,
        fitWindow(w.x, w.y, innerWidth, innerHeight, w.width, w.height),
      );
      s.windows.push(w);
    } else {
      w.minimized = false;
      w.z = z;
    }
    s.active = id;
    s.phase = "desktop";
    await updateUrl(id);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    if (intents[id] !== stamp) return;
    if (
      s.active === id &&
      (await animateWindow(id, kind, s.desktop)) &&
      intents[id] === stamp
    )
      focusWindow(id);
  });
  const dismiss = $(async (id: AppId, remove: boolean, stamp: number) => {
    if (stamp < (intents[id] ?? 0)) return;
    intents[id] = stamp;
    if (
      !(await animateWindow(id, "minimize", s.desktop)) ||
      intents[id] !== stamp
    )
      return;
    const window = s.windows.find((item) => item.id === id);
    if (window) window.minimized = true;
    if (remove && application(id)?.lifecycle !== "background")
      s.windows = s.windows.filter((item) => item.id !== id);
    const next = [...s.windows]
      .filter((item) => !item.minimized)
      .sort((a, b) => b.z - a.z)[0];
    s.active = s.desktop ? next?.id || "" : "";
    await updateUrl(s.active);
    if (s.active) focusWindow(s.active);
    else focusDock(id);
  });
  const close = $((id: AppId, stamp = performance.now()) =>
    dismiss(id, true, stamp),
  );
  const minimize = $((id: AppId, stamp = performance.now()) =>
    dismiss(id, false, stamp),
  );
  const changeSettings = $(async (patch: Partial<Settings>) => {
    s.overrides = { ...s.overrides, ...patch };
    s.settings = effectiveSettings(s.site.settings, s.overrides);
    try {
      savePreferences(localStorage, s.overrides);
    } catch {
      s.notice = "设置已在当前会话生效";
    }
  });
  useVisibleTask$(({ cleanup }) => {
    const media = matchMedia(
      "(min-width:1024px) and (hover:hover) and (pointer:fine)",
    );
    function resize() {
      const segmented = updateViewportRegion();
      s.desktop = media.matches && !segmented;
      for (const w of s.windows)
        Object.assign(
          w,
          fitWindow(w.x, w.y, innerWidth, innerHeight, w.width, w.height),
        );
    }
    resize();
    addEventListener("resize", resize);
    media.addEventListener("change", resize);
    function tick() {
      const now = new Date();
      s.clock = now.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      s.date = now.toLocaleDateString("zh-CN", {
        month: "long",
        day: "numeric",
        weekday: "long",
      });
    }
    tick();
    const interval = setInterval(tick, 1000);
    let disposed = false;
    let bootAnimation: Animation | undefined;
    cleanup(() => {
      disposed = true;
      bootAnimation?.cancel();
      clearInterval(interval);
      removeEventListener("resize", resize);
      media.removeEventListener("change", resize);
      removeEventListener("keydown", keyboard);
    });
    try {
      const saved = readPreferences(localStorage, s.site.settings);
      s.overrides = saved;
      s.settings = effectiveSettings(s.site.settings, saved);
    } catch {}
    try {
      const positions = JSON.parse(localStorage.getItem("windows.v1") || "{}");
      for (const [id, value] of Object.entries(positions)) {
        if (!isApp(id) || !value || typeof value !== "object") continue;
        const v = value as { x?: unknown; y?: unknown; maximized?: unknown };
        if (
          typeof v.x === "number" &&
          Number.isFinite(v.x) &&
          typeof v.y === "number" &&
          Number.isFinite(v.y)
        ) {
          geometry[id] = {
            ...clampWindow(v.x, v.y, innerWidth, innerHeight),
            maximized: v.maximized === true,
          };
        }
      }
    } catch {}
    async function prepare() {
      const wallpaper = new Image();
      wallpaper.src = "/wallpapers/alpine.webp";
      await settleStartupResources(
        [document.fonts.ready, wallpaper.decode()],
        (value) => {
          if (!disposed) progress.value = value;
        },
      );
      if (disposed) return;
      const boot = document.querySelector<HTMLElement>("[data-boot-screen]");
      if (boot) {
        bootAnimation = boot.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: document.documentElement.classList.contains("reduce-motion")
            ? 80
            : 280,
          easing: "ease-out",
          fill: "forwards",
        });
        await bootAnimation.finished.catch(() => {});
      }
      if (disposed) return;
      s.phase = "desktop";
      sessionChecked.value = true;
      if (!disposed) addEventListener("keydown", keyboard);
    }
    function keyboard(e: KeyboardEvent) {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "k" &&
        !s.windows.some((w) => w.id === s.active && w.maximized)
      ) {
        e.preventDefault();
        searchInput.value?.focus();
      }
      if (
        e.key === "Escape" &&
        s.active &&
        !e.defaultPrevented &&
        !(
          e.target instanceof Element &&
          e.target.closest('[role="listbox"], [role="combobox"]')
        )
      ) {
        const active = s.windows.find((w) => w.id === s.active);
        if (s.desktop && active?.maximized) {
          e.preventDefault();
          active.maximized = false;
          focusWindow(active.id);
        } else close(s.active, e.timeStamp);
      }
    }
    void prepare().catch(() => {
      if (disposed) return;
      s.phase = "desktop";
      sessionChecked.value = true;
    });
  });
  useVisibleTask$(({ track, cleanup }) => {
    const settings = track(() => s.settings);
    const dark = matchMedia("(prefers-color-scheme:dark)");
    const reduced = matchMedia("(prefers-reduced-motion:reduce)");
    function apply() {
      document.documentElement.dataset.theme =
        settings.theme === "system"
          ? dark.matches
            ? "dark"
            : "light"
          : settings.theme;
      appearance.theme = document.documentElement.dataset.theme as
        | "light"
        | "dark";
      appearance.accent = settings.accent;
      appearance.reducedMotion =
        settings.motion === "reduced" ||
        (settings.motion === "system" && reduced.matches);
      document.documentElement.dataset.accent = settings.accent;
      document.documentElement.classList.toggle(
        "reduce-motion",
        settings.motion === "reduced" ||
          (settings.motion === "system" && reduced.matches),
      );
    }
    apply();
    dark.addEventListener("change", apply);
    reduced.addEventListener("change", apply);
    cleanup(() => {
      dark.removeEventListener("change", apply);
      reduced.removeEventListener("change", apply);
    });
  });
  const restoreApp = $((id: string | null) => {
    if (isApp(id)) {
      const entry = application(id);
      const browserEntry =
        entry?.kind === "url" && entry.display === "browser"
          ? entry
          : undefined;
      const target = browserEntry ? "browser" : id;
      paths[target] = browserEntry
        ? `/?url=${encodeURIComponent(browserEntry.url)}`
        : new URL(window.location.href).searchParams.get("path") || "/";
      const w = s.windows.find((w) => w.id === target);
      if (!w) {
        s.windows.push({
          id: target,
          ...application(target)?.window,
          ...fitWindow(
            geometry[target]?.x ?? Math.max(24, (innerWidth - 820) / 2),
            geometry[target]?.y ?? 80,
            innerWidth,
            innerHeight,
            application(target)?.window?.width,
            application(target)?.window?.height,
          ),
          z: s.windows.length + 1,
          minimized: false,
          maximized: geometry[target]?.maximized ?? false,
        });
      } else {
        w.minimized = false;
        w.z = Math.max(...s.windows.map((w) => w.z)) + 1;
      }
      s.active = target;
      s.phase = "desktop";
    } else {
      s.active = "";
      if (id) {
        const url = new URL(window.location.href);
        url.searchParams.delete("app");
        history.replaceState(history.state, "", url);
      }
    }
  });
  useVisibleTask$(({ track, cleanup }) => {
    const ready = track(() => sessionChecked.value);
    if (!ready) return;
    function restore() {
      const url = new URL(window.location.href);
      const pathnameApp = url.pathname.split("/")[1];
      return restoreApp(
        ["about", "music", "navigation"].includes(pathnameApp)
          ? pathnameApp
          : url.searchParams.get("app"),
      );
    }
    restore();
    window.addEventListener("popstate", restore);
    cleanup(() => window.removeEventListener("popstate", restore));
  });
  useVisibleTask$(({ track, cleanup }) => {
    const positions = track(() =>
      s.windows.map(({ id, x, y, maximized }) => ({ id, x, y, maximized })),
    );
    const timer = setTimeout(() => {
      for (const { id, x, y, maximized } of positions)
        geometry[id] = { x, y, maximized };
      try {
        localStorage.setItem("windows.v1", JSON.stringify(geometry));
      } catch {}
    }, 200);
    cleanup(() => clearTimeout(timer));
  });
  useVisibleTask$(({ track, cleanup }) => {
    const active = track(() => s.active);
    const desktop = track(() => s.desktop);
    const phase = track(() => s.phase);
    const oldOverflow = document.body.style.overflow;
    if (active && !desktop && phase === "desktop")
      document.body.style.overflow = "hidden";
    const viewport = window.visualViewport;
    function updateViewport() {
      document.documentElement.style.setProperty(
        "--visual-height",
        `${viewport?.height || innerHeight}px`,
      );
    }
    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    cleanup(() => {
      document.body.style.overflow = oldOverflow;
      viewport?.removeEventListener("resize", updateViewport);
    });
  });
  useVisibleTask$(({ track }) => {
    const title = track(() => s.site.profile.title);
    const description = track(() => s.site.profile.description);
    document.title = title || "draco.dev";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", description);
  });
  const fullscreen =
    s.desktop &&
    s.windows.some((w) => w.id === s.active && w.maximized && !w.minimized);
  const wallpaper = s.settings.wallpapers.find(
    (w) => w.id === s.settings.wallpaper,
  )?.url;
  return (
    <div
      data-mode={s.desktop ? "desktop" : "touch"}
      data-icons={s.settings.icons}
      class="isolate min-h-dvh overflow-x-clip text-content"
    >
      <Wallpaper appearance={s.settings.wallpaper} url={wallpaper} />
      <SystemMenuBar
        state={s}
        onWelcome$={$(() => {
          s.phase = "welcome";
        })}
      />
      <div key="system-screens" data-system-screens>
        {s.phase === "boot" ? (
          <BootScreen
            progress={progress.value}
            avatar={s.site.profile.avatar}
          />
        ) : s.phase === "welcome" ? (
          <WelcomeScreen
            profile={s.site.profile}
            date={s.date}
            clock={s.clock}
            desktop={s.desktop}
            reducedMotion={appearance.reducedMotion}
            onEnter$={$(() => {
              s.phase = "desktop";
            })}
          />
        ) : null}
      </div>
      <div
        key="desktop-surface"
        data-desktop-surface
        hidden={s.phase !== "desktop"}
      >
        <DesktopHome
          s={s}
          query={query}
          searchInput={searchInput}
          open={open}
          changeSettings={changeSettings}
        />
        <div class="pointer-events-none fixed inset-0 z-100">
          {s.windows.map((w) => (
            <WindowFrame
              key={w.id}
              w={w}
              title={titles[w.id]}
              desktop={s.desktop}
              focused={s.active === w.id}
              visible={
                !!s.active && (s.active === w.id || (s.desktop && !fullscreen))
              }
              onClose$={$((stamp?: number) => close(w.id, stamp))}
              onMinimize$={$((stamp?: number) => minimize(w.id, stamp))}
              onFocus$={$(() => {
                if (s.active !== w.id) {
                  w.z = Math.max(...s.windows.map((w) => w.z)) + 1;
                  s.active = w.id;
                  updateUrl(w.id);
                }
              })}
              onMaximize$={$(() => {
                w.maximized = !w.maximized;
              })}
              onMove$={$((x: number, y: number) => {
                w.x = x;
                w.y = y;
              })}
            >
              {w.id === "settings" ? (
                <SettingsApp
                  settings={s.settings}
                  onChange$={changeSettings}
                  onReset$={$(() => {
                    s.overrides = {};
                    s.settings = { ...initial.settings };
                    try {
                      resetPreferences(localStorage);
                    } catch {}
                  })}
                />
              ) : w.id === "browser" ? (
                <BrowserApp
                  sites={browserSites}
                  engine={s.settings.engine}
                  host={{
                    mode: "desktop",
                    appearance,
                    visible: !w.minimized && (s.desktop || s.active === w.id),
                    path: paths.browser || "/",
                    openUrl$: $((url: string) => {
                      paths.browser = `/?url=${encodeURIComponent(url)}`;
                    }),
                    navigate$: $((path: string) => {
                      paths.browser = path;
                      updateUrl("browser");
                    }),
                    setTitle$: $((title: string) => {
                      titles.browser = title;
                    }),
                  }}
                >
                  <ModuleApp
                    navigationLibrary={navigationLibrary}
                    id="navigation"
                    host={{
                      mode: "desktop",
                      appearance,
                      visible: true,
                      path: "/",
                      openUrl$: $((url: string) => {
                        paths.browser = `/?url=${encodeURIComponent(url)}`;
                        updateUrl("browser");
                      }),
                      navigate$: $(() => {}),
                      setTitle$: $(() => {}),
                    }}
                  />
                </BrowserApp>
              ) : (
                <ModuleApp
                  navigationLibrary={navigationLibrary}
                  id={w.id}
                  host={{
                    mode: "desktop",
                    appearance,
                    visible: !w.minimized && (s.desktop || s.active === w.id),
                    path: paths[w.id] || "/",
                    openUrl$: $((url: string) => {
                      paths.browser = `/?url=${encodeURIComponent(url)}`;
                      return open("browser");
                    }),
                    navigate$: $((path: string) => {
                      paths[w.id] = path;
                      if (s.active === w.id) updateUrl(w.id);
                    }),
                    setTitle$: $((title: string) => {
                      titles[w.id] = title;
                    }),
                  }}
                />
              )}
            </WindowFrame>
          ))}
        </div>
        <Dock
          s={s}
          open={open}
          home={$(() => {
            s.active = "";
            updateUrl("");
          })}
        />
      </div>
      {s.notice && (
        <output class="fixed top-[52px] left-1/2 z-2000 flex -translate-x-1/2 animate-rise items-center gap-2.5 rounded-panel bg-surface px-[15px] py-2.5 text-(length:--text-control) shadow-window">
          <Icon name="check" size={18} />
          {s.notice}
          <button
            aria-label="关闭提示"
            class="inline-flex items-center justify-center rounded-control bg-transparent p-1.5 hover:bg-content/8"
            onClick$={() => (s.notice = "")}
          >
            <Icon name="close" size={15} />
          </button>
        </output>
      )}
    </div>
  );
});
