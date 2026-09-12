import {
  $,
  component$,
  type QRL,
  useId,
  useOnWindow,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@qwik.dev/core";
import { cva } from "class-variance-authority";
import { cn } from "cn";
import { selectPosition } from "./select-position";
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange$: QRL<(value: string) => unknown>;
  "aria-label": string;
  class?: string;
  disabled?: boolean;
  name?: string;
  align?: "start" | "end";
}
export const selectVariants = cva(
  "inline-flex items-center justify-between gap-2 min-h-11 min-w-0 rounded-panel border-0 bg-glass px-3.5 py-2 text-(length:--text-control) text-accent transition-[background-color,scale] duration-micro active:scale-98 active:bg-content/10 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
);
export const Select = component$<SelectProps>((props) => {
  const id = useId();
  const trigger = useSignal<HTMLButtonElement>();
  const panel = useSignal<HTMLDivElement>();
  const state = useStore({
    open: false,
    active: 0,
    left: 0,
    top: 0,
    width: 144,
    height: 280,
    query: "",
    typed: 0,
  });
  const close = $((restore = true) => {
    panel.value?.hidePopover();
    state.open = false;
    if (restore) trigger.value?.focus({ preventScroll: true });
  });
  const open = $(() => {
    if (props.disabled || !props.options.some((o) => !o.disabled)) return;
    const rect = trigger.value?.getBoundingClientRect();
    if (!rect) return;
    Object.assign(
      state,
      selectPosition(rect, props.options.length, props.align),
    );
    state.active = props.options.findIndex(
      (o) => o.value === props.value && !o.disabled,
    );
    if (state.active < 0)
      state.active = props.options.findIndex((o) => !o.disabled);
    state.query = "";
    state.typed = 0;
    state.open = true;
    panel.value?.showPopover();
    panel.value?.focus({ preventScroll: true });
  });
  const choose = $(async (index: number) => {
    const option = props.options[index];
    if (!option || option.disabled) return;
    await props.onChange$(option.value);
    await close();
  });
  const key = $(async (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      await close();
      return;
    }
    if (event.key === "Tab") {
      const backwards = event.shiftKey;
      await close();
      const elements = [
        ...document.querySelectorAll<HTMLElement>(
          "button, a[href], input, select, textarea, [tabindex]",
        ),
      ].filter(
        (el) =>
          el.tabIndex >= 0 &&
          !el.matches(":disabled") &&
          !el.closest("[inert]") &&
          el.getClientRects().length > 0,
      );
      const index = elements.indexOf(trigger.value as HTMLElement);
      elements[index + (backwards ? -1 : 1)]?.focus();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      await choose(state.active);
      return;
    }
    const enabled = props.options
      .map((o, i) => (o.disabled ? -1 : i))
      .filter((i) => i >= 0);
    let pos = enabled.indexOf(state.active);
    if (event.key === "ArrowDown") pos = (pos + 1) % enabled.length;
    else if (event.key === "ArrowUp")
      pos = (pos - 1 + enabled.length) % enabled.length;
    else if (event.key === "Home") pos = 0;
    else if (event.key === "End") pos = enabled.length - 1;
    else if (event.key.length === 1) {
      state.query =
        (Date.now() - state.typed < 700 ? state.query : "") +
        event.key.toLocaleLowerCase();
      state.typed = Date.now();
      const found = enabled.findIndex((i) =>
        props.options[i]?.label.toLocaleLowerCase().startsWith(state.query),
      );
      if (found >= 0) pos = found;
    }
    state.active = enabled[pos] ?? state.active;
    document
      .getElementById(`${id}-${state.active}`)
      ?.scrollIntoView({ block: "nearest" });
  });
  useOnWindow(
    "resize",
    $(() => close(false)),
  );
  useVisibleTask$(({ track, cleanup }) => {
    if (!track(() => state.open)) return;
    function dismissOnScroll(event: Event) {
      if (event.target instanceof Node && panel.value?.contains(event.target))
        return;
      void close();
    }
    function dismissOnViewport() {
      void close();
    }
    document.addEventListener("scroll", dismissOnScroll, true);
    window.visualViewport?.addEventListener("resize", dismissOnViewport);
    window.visualViewport?.addEventListener("scroll", dismissOnViewport);
    cleanup(() => {
      document.removeEventListener("scroll", dismissOnScroll, true);
      window.visualViewport?.removeEventListener("resize", dismissOnViewport);
      window.visualViewport?.removeEventListener("scroll", dismissOnViewport);
    });
  });
  return (
    <>
      {props.name && (
        <input type="hidden" name={props.name} value={props.value} />
      )}
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={props["aria-label"]}
        aria-expanded={state.open}
        aria-autocomplete="none"
        aria-controls={id}
        aria-haspopup="listbox"
        disabled={props.disabled}
        class={cn(selectVariants(), props.class)}
        onClick$={() => (state.open ? close() : open())}
        onKeyDown$={async (e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") await open();
        }}
      >
        <span class="truncate">
          {props.options.find((o) => o.value === props.value)?.label ||
            "请选择"}
        </span>
        <span aria-hidden="true" class="shrink-0 text-muted">
          <svg
            aria-hidden="true"
            width="12"
            height="16"
            viewBox="0 0 12 16"
            fill="none"
          >
            <path
              d="m3 6 3-3 3 3M3 10l3 3 3-3"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="listbox"
        tabIndex={-1}
        aria-label={props["aria-label"]}
        aria-activedescendant={`${id}-${state.active}`}
        class="fixed m-0 min-w-0 overscroll-contain overflow-y-auto rounded-widget border-0 bg-glass/90 p-1.5 text-content shadow-glass backdrop-blur-2xl backdrop-saturate-150 outline-none opacity-0 scale-95 transition-[opacity,scale,display,overlay] duration-panel transition-discrete [&:popover-open]:opacity-100 [&:popover-open]:scale-100 starting:[&:popover-open]:opacity-0 starting:[&:popover-open]:scale-95"
        style={{
          left: `${state.left}px`,
          top: `${state.top}px`,
          width: `${state.width}px`,
          maxHeight: `${state.height}px`,
        }}
        onToggle$={(e) => {
          state.open = (e as ToggleEvent).newState === "open";
        }}
        stoppropagation:keydown
        preventdefault:keydown
        onKeyDown$={key}
      >
        {props.options.map((option, index) => (
          <div
            key={`option:${option.value}`}
            id={`${id}-${index}`}
            role="option"
            tabIndex={-1}
            aria-selected={props.value === option.value}
            aria-disabled={option.disabled || undefined}
            class={cn(
              "relative flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 text-base transition-colors duration-micro active:bg-content/15 after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-divider/50 last:after:hidden",
              state.active === index && "bg-content/5",
              option.disabled && "cursor-default opacity-45",
            )}
            onPointerMove$={() => {
              if (!option.disabled) state.active = index;
            }}
            onClick$={() => choose(index)}
          >
            <span
              aria-hidden="true"
              class="w-4 shrink-0 font-semibold text-accent"
            >
              {props.value === option.value ? "✓" : ""}
            </span>
            {option.label}
          </div>
        ))}
      </div>
    </>
  );
});
