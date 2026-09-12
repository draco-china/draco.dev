import {
  component$,
  type PropsOf,
  useSignal,
  useVisibleTask$,
} from "@qwik.dev/core";
import { cva } from "class-variance-authority";
import { cn } from "cn";

export const sliderVariants = cva(
  "h-8 w-full min-w-0 cursor-pointer appearance-none rounded-full bg-transparent accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-45 pointer-coarse:h-11 [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--color-accent)_var(--slider-progress),var(--color-glass)_var(--slider-progress))] [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-on-accent [&::-webkit-slider-thumb]:shadow-control [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-glass [&::-moz-range-progress]:h-1 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-accent [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-on-accent [&::-moz-range-thumb]:shadow-control",
);

export type SliderProps = Omit<PropsOf<"input">, "type" | "style">;

export const Slider = component$<SliderProps>((props) => {
  const min = Number(props.min ?? 0);
  const max = Number(props.max ?? 100);
  const value = Number(
    props.value ?? props["bind:value"]?.value ?? (min + max) / 2,
  );
  const ref = useSignal<HTMLInputElement>();
  useVisibleTask$(
    ({ cleanup }) => {
      const input = ref.value;
      if (!input) return;
      function syncProgress() {
        if (!input) return;
        const low = Number(input.min || 0);
        const high = Number(input.max || 100);
        const ratio =
          high > low
            ? Math.max(
                0,
                Math.min(
                  100,
                  ((Number(input.value) - low) / (high - low)) * 100,
                ),
              )
            : 0;
        input.style.setProperty("--slider-progress", `${ratio}%`);
      }
      input.addEventListener("input", syncProgress);
      cleanup(() => input.removeEventListener("input", syncProgress));
    },
    { strategy: "document-ready" },
  );
  const progress =
    Number.isFinite(value) && max > min
      ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
      : 0;
  return (
    <input
      {...props}
      ref={ref}
      type="range"
      value={value}
      style={{ "--slider-progress": `${progress}%` }}
      class={cn(sliderVariants(), props.class)}
    />
  );
});
