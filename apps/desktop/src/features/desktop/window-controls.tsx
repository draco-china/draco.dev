import { component$, type QRL } from "@qwik.dev/core";
export interface WindowControlsProps {
  title: string;
  maximized?: boolean;
  onClose$: QRL<(stamp?: number) => void | Promise<void>>;
  onMinimize$: QRL<(stamp?: number) => void | Promise<void>>;
  onMaximize$: QRL<() => void | Promise<void>>;
}
const control =
  "relative flex size-[14px] shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-[11px] leading-none text-black/60 outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent";
const symbol =
  "relative block shrink-0 opacity-0 group-hover/traffic:opacity-100 group-focus-within/traffic:opacity-100";
export const WindowControls = component$<WindowControlsProps>((props) => (
  <div class="group/traffic flex touch:hidden w-[65px] shrink-0 items-center gap-1.5">
    <button
      type="button"
      class={`${control} close`}
      aria-label={`关闭${props.title}`}
      onClick$={(event) => props.onClose$(event.timeStamp)}
    >
      <img
        src="/icons/macos/window-controls/close.webp"
        width={14}
        height={14}
        alt=""
        draggable={false}
        class="pointer-events-none absolute inset-0 size-full"
      />
      <svg
        class={symbol}
        width="8"
        height="8"
        viewBox="0 0 8 8"
        aria-hidden="true"
      >
        <path
          d="m1.75 1.75 4.5 4.5m0-4.5-4.5 4.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.1"
        />
      </svg>
    </button>
    <button
      type="button"
      class={`${control} minimize`}
      aria-label={`最小化${props.title}`}
      onClick$={(event) => props.onMinimize$(event.timeStamp)}
    >
      <img
        src="/icons/macos/window-controls/minimize.webp"
        width={14}
        height={14}
        alt=""
        draggable={false}
        class="pointer-events-none absolute inset-0 size-full"
      />
      <svg
        class={symbol}
        width="8"
        height="8"
        viewBox="0 0 8 8"
        aria-hidden="true"
      >
        <path
          d="M1.5 4h5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.1"
        />
      </svg>
    </button>
    <button
      type="button"
      class={`${control} maximize`}
      aria-label={`${props.maximized ? "恢复" : "最大化"}${props.title}`}
      onClick$={props.onMaximize$}
    >
      <img
        src="/icons/macos/window-controls/zoom.webp"
        width={14}
        height={14}
        alt=""
        draggable={false}
        class="pointer-events-none absolute inset-0 size-full"
      />
      <svg
        class={symbol}
        width="8"
        height="8"
        viewBox="0 0 8 8"
        aria-hidden="true"
      >
        <path
          d={
            props.maximized
              ? "M1 3.5h3.5V7Zm6 1H3.5V1Z"
              : "M1 3.5V7h3.5Zm6 1V1H3.5Z"
          }
          fill="currentColor"
        />
      </svg>
    </button>
  </div>
));
