import { component$, type QRL } from "@qwik.dev/core";
import { cn } from "cn";
import { AppIcon } from "./app-icon";
import { dockApps as apps } from "./app-registry";
import { type AppId, appNames, type DesktopState } from "./state";
export const Dock = component$<{
  s: DesktopState;
  open: QRL<(id: AppId, stamp?: number) => Promise<void>>;
  home: QRL<() => void>;
}>(({ s, open, home }) => (
  <nav
    hidden={
      s.desktop &&
      s.windows.some((w) => w.id === s.active && w.maximized && !w.minimized)
    }
    class={cn(
      "fixed bottom-[max(16px,env(safe-area-inset-bottom))] left-1/2 z-1200 flex -translate-x-1/2 items-center gap-1.5 rounded-[25px] bg-glass px-2.5 pt-2 pb-1 shadow-dock backdrop-blur-[30px] backdrop-saturate-150  max-tablet:gap-1.5 max-phone:gap-1 max-phone:px-2 max-phone:pt-1.5 max-phone:pb-1 max-phone:rounded-widget max-phone:max-w-[calc(100vw-22px)] short-screen:bottom-2 short-screen:gap-1 short-screen:px-2 short-screen:pt-2 short-screen:pb-1",
      !s.desktop && s.active && "invisible pointer-events-none",
    )}
    aria-label="应用程序"
  >
    <button
      data-dock="home"
      class="group relative flex origin-bottom justify-center bg-transparent px-0 pb-1.5 touch:hidden"
      aria-label="回到桌面"
      onClick$={() => {
        home();
      }}
    >
      <AppIcon app="home" dock />
      <span class="touch:hidden group-hover:opacity-100 group-focus-visible:opacity-100 pointer-events-none absolute bottom-20 rounded-control bg-surface shadow-glass px-3 py-[7px] text-xs whitespace-nowrap opacity-0 transition-opacity duration-micro">
        桌面
      </span>
    </button>
    <span class="touch:hidden mx-1 mb-1.5 h-8 w-px bg-(--line)" />
    {apps.map((id) => (
      <button
        key={id}
        class={cn(
          "group relative flex origin-bottom justify-center bg-transparent px-0 pb-1.5",
        )}
        data-dock={id}
        aria-label={appNames[id]}
        aria-pressed={s.active === id}
        onClick$={(event) => open(id, event.timeStamp)}
      >
        <AppIcon
          app={id}
          dock
          class="max-phone:size-[min(43px,calc((100vw-52px)/7))] max-phone:[&_svg]:size-[min(26px,calc((100vw-100px)/9))]"
        />
        <span class="touch:hidden group-hover:opacity-100 group-focus-visible:opacity-100 pointer-events-none absolute bottom-20 rounded-control bg-surface shadow-glass px-3 py-[7px] text-xs whitespace-nowrap opacity-0 transition-opacity duration-micro">
          {appNames[id]}
        </span>
        <span
          class={cn(
            "absolute bottom-0 size-1 rounded-full touch:hidden",
            s.windows.some((w) => w.id === id)
              ? "bg-content"
              : "bg-transparent",
          )}
        />
      </button>
    ))}
  </nav>
));
