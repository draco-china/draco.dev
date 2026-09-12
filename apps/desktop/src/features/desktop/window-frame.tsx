import {
  component$,
  type QRL,
  Slot,
  useSignal,
  useVisibleTask$,
} from "@qwik.dev/core";
import { Icon } from "@workspace/ui/icon";
import { cva } from "class-variance-authority";
import { cn } from "cn";
import { motionTokens } from "./motion";
import { appNames, clampWindow, type WindowState } from "./state";
import { WindowControls } from "./window-controls";
export interface WindowFrameProps {
  w: WindowState;
  title?: string;
  desktop: boolean;
  focused: boolean;
  visible: boolean;
  onClose$: QRL<(stamp?: number) => void | Promise<void>>;
  onMinimize$: QRL<(stamp?: number) => void | Promise<void>>;
  onFocus$: QRL<() => void | Promise<void>>;
  onMaximize$: QRL<() => void | Promise<void>>;
  onMove$: QRL<(x: number, y: number) => void | Promise<void>>;
}
const windowVariants = cva(
  "@container/window pointer-events-auto absolute flex flex-col overflow-hidden rounded-widget bg-glass shadow-window backdrop-blur-[40px] backdrop-saturate-[1.2] animate-window-in transition-[left,top,width,height,border-radius] duration-window ease-system data-[dragging]:transition-none",
  {
    variants: {
      desktop: {
        true: "",
        false:
          "left-[max(20px,var(--safe-left,env(safe-area-inset-left)),calc((100vw-820px)/2))] top-[max(60px,var(--safe-top,env(safe-area-inset-top)))] w-[min(820px,calc(100vw-max(20px,var(--safe-left,env(safe-area-inset-left)))-max(20px,var(--safe-right,env(safe-area-inset-right)))))] h-[min(calc(100dvh-165px),calc(var(--visual-height,100dvh)-max(60px,var(--safe-top,env(safe-area-inset-top)))-max(12px,var(--safe-bottom,env(safe-area-inset-bottom)))))] max-phone:left-0 max-phone:top-0 max-phone:w-full max-phone:h-[min(100dvh,var(--visual-height,100dvh))] max-phone:rounded-none max-phone:pt-[var(--safe-top,env(safe-area-inset-top))] max-phone:pl-[var(--safe-left,env(safe-area-inset-left))] max-phone:pr-[var(--safe-right,env(safe-area-inset-right))] short-screen:left-0 short-screen:top-0 short-screen:w-full short-screen:h-[min(100dvh,var(--visual-height,100dvh))] short-screen:rounded-none short-screen:pt-[var(--safe-top,env(safe-area-inset-top))] short-screen:pl-[var(--safe-left,env(safe-area-inset-left))] short-screen:pr-[var(--safe-right,env(safe-area-inset-right))]",
      },
      focused: { false: "saturate-[.8]", true: "" },
      maximized: { true: "", false: "" },
    },
    compoundVariants: [
      {
        desktop: true,
        maximized: true,
        class: "left-0 top-0 h-dvh w-full rounded-none",
      },
    ],
  },
);
export const WindowFrame = component$<WindowFrameProps>((props) => {
  const bar = useSignal<HTMLElement>();
  useVisibleTask$(
    ({ track, cleanup }) => {
      const current = track(() => bar.value);
      track(() => props.desktop);
      const visible = track(() => props.visible);
      const minimized = track(() => props.w.minimized);
      track(() => props.w.maximized);
      const parent = current?.parentElement;
      if (!current || !parent || !visible || minimized) return;
      const element: HTMLElement = current;
      const frame: HTMLElement = parent;
      const drag = {
        active: false,
        frame: 0,
        startX: 0,
        startY: 0,
        x: 0,
        y: 0,
        dx: 0,
        dy: 0,
        offsetY: 0,
        pointerId: -1,
        generation: 0,
      };
      let spring: Animation | undefined;
      function settle() {
        const transform = frame.style.transform;
        frame.style.transform = "";
        spring?.cancel();
        if (
          !transform ||
          document.documentElement.classList.contains("reduce-motion")
        )
          return;
        const tokens = motionTokens();
        spring = frame.animate(
          [
            { transform },
            { transform: "translateY(-5px)", offset: 0.72 },
            { transform: "none" },
          ],
          { duration: tokens.enter, easing: tokens.spring },
        );
      }
      function down(event: PointerEvent) {
        if (
          !event.isPrimary ||
          event.button !== 0 ||
          (event.target instanceof Element && event.target.closest("button")) ||
          (props.desktop && props.w.maximized)
        )
          return;
        const transform = getComputedStyle(frame).transform;
        drag.offsetY =
          !props.desktop && transform !== "none"
            ? new DOMMatrixReadOnly(transform).m42
            : 0;
        drag.generation++;
        drag.pointerId = event.pointerId;
        drag.active = true;
        drag.startX = event.clientX;
        drag.startY = event.clientY;
        drag.x = props.w.x;
        drag.y = props.w.y;
        drag.dx = 0;
        drag.dy = 0;
        for (const animation of frame.getAnimations()) animation.cancel();
        frame.setAttribute("data-dragging", "");
        if (!props.desktop)
          frame.style.transform = `translateY(${drag.offsetY}px)`;
        element.setPointerCapture(event.pointerId);
      }
      function position() {
        if (props.desktop) {
          const next = clampWindow(
            drag.x + drag.dx,
            drag.y + drag.dy,
            innerWidth,
            innerHeight,
          );
          void props.onMove$(next.x, next.y);
        } else
          frame.style.transform = `translateY(${Math.max(0, drag.offsetY + drag.dy)}px)`;
      }
      function move(event: PointerEvent) {
        if (!drag.active || event.pointerId !== drag.pointerId) return;
        drag.dx = event.clientX - drag.startX;
        drag.dy = event.clientY - drag.startY;
        if (drag.frame) return;
        drag.frame = requestAnimationFrame(() => {
          drag.frame = 0;
          if (drag.active) position();
        });
      }
      function up(event: PointerEvent) {
        if (!drag.active || event.pointerId !== drag.pointerId) return;
        drag.dx = event.clientX - drag.startX;
        drag.dy = event.clientY - drag.startY;
        position();
        drag.active = false;
        cancelAnimationFrame(drag.frame);
        drag.frame = 0;
        frame.removeAttribute("data-dragging");
        if (element.hasPointerCapture(event.pointerId))
          element.releasePointerCapture(event.pointerId);
        if (!props.desktop) {
          if (drag.offsetY + drag.dy > 120) {
            const generation = drag.generation;
            void props.onClose$(event.timeStamp).then(() => {
              if (generation === drag.generation && !drag.active)
                frame.style.transform = "";
            });
          } else settle();
        }
      }
      function cancel(event: PointerEvent) {
        if (!drag.active || event.pointerId !== drag.pointerId) return;
        drag.active = false;
        drag.generation++;
        cancelAnimationFrame(drag.frame);
        drag.frame = 0;
        frame.removeAttribute("data-dragging");
        if (element.hasPointerCapture(event.pointerId))
          element.releasePointerCapture(event.pointerId);
        if (!props.desktop) settle();
      }
      element.addEventListener("pointerdown", down);
      element.addEventListener("pointermove", move);
      element.addEventListener("pointerup", up);
      element.addEventListener("pointercancel", cancel);
      element.addEventListener("lostpointercapture", cancel);
      cleanup(() => {
        drag.active = false;
        drag.generation++;
        cancelAnimationFrame(drag.frame);
        spring?.cancel();
        element.removeEventListener("pointerdown", down);
        element.removeEventListener("pointermove", move);
        element.removeEventListener("pointerup", up);
        element.removeEventListener("pointercancel", cancel);
        element.removeEventListener("lostpointercapture", cancel);
        if (element.hasPointerCapture(drag.pointerId))
          element.releasePointerCapture(drag.pointerId);
        frame.removeAttribute("data-dragging");
        frame.style.transform = "";
      });
    },
    { strategy: "document-ready" },
  );
  return (
    <section
      data-window={props.w.id}
      data-focused={props.focused}
      data-maximized={props.w.maximized}
      class={windowVariants({
        desktop: props.desktop,
        focused: props.focused,
        maximized: props.w.maximized,
      })}
      style={{
        width:
          props.desktop && !props.w.maximized
            ? `min(${props.w.width || 820}px, calc(100vw - 48px))`
            : undefined,
        height:
          props.desktop && !props.w.maximized
            ? `min(${props.w.height || 600}px, calc(100dvh - 150px))`
            : undefined,
        left:
          props.desktop && !props.w.maximized ? `${props.w.x}px` : undefined,
        top: props.desktop && !props.w.maximized ? `${props.w.y}px` : undefined,
        zIndex: props.w.z,
        display: props.visible && !props.w.minimized ? undefined : "none",
      }}
      aria-label={props.title || appNames[props.w.id]}
      onPointerDown$={props.onFocus$}
    >
      <header
        ref={bar}
        data-window-bar
        class={cn(
          "max-phone:h-[54px] flex h-12 shrink-0 touch-none select-none items-center justify-between border-0 px-5 text-(length:--text-control) cursor-grab active:cursor-grabbing bg-transparent",
          props.w.id === "navigation" &&
            "@min-[760px]/window:grid @min-[760px]/window:grid-cols-[190px_minmax(0,1fr)] @min-[760px]/window:px-0",
          props.w.id === "settings" &&
            "@min-[680px]/window:grid @min-[680px]/window:grid-cols-[180px_minmax(0,1fr)] @min-[680px]/window:px-0",
          props.w.id === "browser" &&
            props.desktop &&
            "absolute left-0 top-0 z-10 w-[100px] border-0 bg-transparent",
        )}
        onDblClick$={(event) => {
          if (props.desktop && !(event.target as HTMLElement).closest("button"))
            props.onMaximize$();
        }}
      >
        <div
          data-window-controls-region
          class={cn(
            "flex items-center",
            props.w.id === "navigation" &&
              "@min-[760px]/window:h-full @min-[760px]/window:bg-content/3 @min-[760px]/window:px-5",
            props.w.id === "settings" &&
              "@min-[680px]/window:h-full @min-[680px]/window:bg-content/3 @min-[680px]/window:px-5",
          )}
        >
          <WindowControls
            maximized={props.w.maximized}
            title={props.title || appNames[props.w.id]}
            onClose$={props.onClose$}
            onMinimize$={props.onMinimize$}
            onMaximize$={props.onMaximize$}
          />
          <button
            type="button"
            class="hidden touch:flex size-8 items-center justify-center rounded-control border-0 bg-transparent text-content hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-accent"
            aria-label="回到桌面"
            onClick$={(event) => props.onMinimize$(event.timeStamp)}
          >
            <Icon name="back" size={20} />
          </button>
        </div>
        <strong
          class={
            props.w.id === "browser" && props.desktop
              ? "sr-only"
              : props.w.id === "navigation"
                ? "@min-[760px]/window:px-7 @min-[760px]/window:text-left"
                : props.w.id === "settings"
                  ? "@min-[680px]/window:px-7 @min-[680px]/window:text-left"
                  : undefined
          }
          data-window-title
          tabIndex={-1}
          title={`${props.title || appNames[props.w.id]}窗口，使用方向键移动，回车切换最大化`}
          onKeyDown$={(event) => {
            if (!props.desktop) return;
            if (event.key === "Enter") {
              props.onMaximize$();
              return;
            }
            const step = event.shiftKey ? 40 : 10;
            const dx =
              event.key === "ArrowLeft"
                ? -step
                : event.key === "ArrowRight"
                  ? step
                  : 0;
            const dy =
              event.key === "ArrowUp"
                ? -step
                : event.key === "ArrowDown"
                  ? step
                  : 0;
            if ((dx || dy) && !props.w.maximized) {
              const position = clampWindow(
                props.w.x + dx,
                props.w.y + dy,
                innerWidth,
                innerHeight,
              );
              props.onMove$(position.x, position.y);
            }
          }}
        >
          {props.title || appNames[props.w.id]}
        </strong>
        <span
          class={
            props.w.id === "browser" && props.desktop
              ? "hidden"
              : props.w.id === "navigation"
                ? "w-[65px] touch:w-8 @min-[760px]/window:hidden"
                : props.w.id === "settings"
                  ? "w-[65px] touch:w-8 @min-[680px]/window:hidden"
                  : "w-[65px] touch:w-8"
          }
        />
      </header>
      <div
        data-window-body
        class={cn(
          "min-h-0 flex-1 overflow-auto overscroll-contain touch:pb-[var(--safe-bottom,env(safe-area-inset-bottom))]",
          props.w.id === "browser" && "overflow-hidden",
        )}
      >
        <Slot />
      </div>
    </section>
  );
});
