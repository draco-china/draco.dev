import { component$, type PropsOf, Slot } from "@qwik.dev/core";
import { cva } from "class-variance-authority";
import { cn } from "cn";
export const fieldVariants = cva("flex gap-2 text-xs", {
  variants: {
    layout: {
      column: "mb-4 flex-col",
      row: "mb-0 flex-row items-center justify-between",
    },
  },
  defaultVariants: { layout: "column" },
});
export const Field = component$<
  PropsOf<"label"> & {
    label?: string;
    hint?: string;
    error?: string;
    layout?: "column" | "row";
  }
>(({ label, hint, error, layout, ...props }) => (
  // biome-ignore lint/a11y/noLabelWithoutControl: Slotted native form control is implicitly labelled.
  <label {...props} class={cn(fieldVariants({ layout }), props.class)}>
    {label && <span class="font-medium">{label}</span>}
    <Slot />
    {hint && (
      <small class="text-[11px] leading-relaxed text-muted">{hint}</small>
    )}
    {error && (
      <span class="text-[11px] text-danger" role="alert">
        {error}
      </span>
    )}
  </label>
));
