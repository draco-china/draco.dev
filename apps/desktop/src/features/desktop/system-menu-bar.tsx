import { component$, type QRL } from "@qwik.dev/core";
import { appNames, type DesktopState } from "./state";

export const SystemMenuBar = component$<{
  state: DesktopState;
  onWelcome$: QRL<() => void>;
}>(({ state, onWelcome$ }) => (
  <header
    data-system-menu-bar
    hidden={
      !state.desktop ||
      state.phase !== "desktop" ||
      state.windows.some(
        (w) => w.id === state.active && w.maximized && !w.minimized,
      )
    }
    class="relative z-1300 flex h-9 items-center justify-between gap-6 bg-transparent px-[22px] text-xs text-(--desktop-content) [text-shadow:0_1px_3px_var(--label-shadow)]"
  >
    <div class="flex min-w-0 items-center gap-5">
      <button
        type="button"
        class="flex items-center gap-2 rounded-control bg-transparent px-1 py-1 font-semibold"
        aria-label="打开欢迎页"
        onClick$={onWelcome$}
      >
        <img
          src="/favicon.svg"
          width={18}
          height={18}
          alt=""
          class="size-[18px] shrink-0"
        />
        <span>draco.dev</span>
      </button>
      {state.active && (
        <span class="truncate font-medium">{appNames[state.active]}</span>
      )}
    </div>
    <div class="flex shrink-0 items-center gap-5">
      <time>
        {state.date}　{state.clock}
      </time>
    </div>
  </header>
));
