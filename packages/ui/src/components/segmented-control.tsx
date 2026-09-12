import { component$, type QRL } from "@qwik.dev/core";
import { cva } from "class-variance-authority";

export interface SegmentOption {
  value: string;
  label: string;
  disabled?: boolean;
}
const segmentVariants = cva(
  "min-h-8 pointer-coarse:min-h-11 flex-1 cursor-pointer disabled:cursor-default disabled:opacity-45 rounded-control border-0 bg-transparent px-3 py-1.5 text-xs text-content transition-[background-color,box-shadow,opacity] duration-micro aria-pressed:bg-surface aria-pressed:shadow-control focus-visible:outline-2 focus-visible:outline-accent",
);
export const SegmentedControl = component$<{
  label: string;
  value: string;
  options: SegmentOption[];
  onChange$: QRL<(value: string) => void>;
}>(({ label, value, options, onChange$ }) => (
  <fieldset
    class="m-0 flex min-w-0 gap-1 rounded-control border-0 bg-control-track/25 p-1"
    aria-label={label}
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        class={segmentVariants()}
        disabled={option.disabled}
        aria-pressed={value === option.value}
        onClick$={() => onChange$(option.value)}
      >
        {option.label}
      </button>
    ))}
  </fieldset>
));
