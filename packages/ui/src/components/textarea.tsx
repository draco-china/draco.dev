import { component$, type PropsOf } from "@qwik.dev/core";
import { cva } from "class-variance-authority";
import { cn } from "cn";
export const textareaVariants = cva(
  "min-h-21 resize-y min-w-0 rounded-control border-0 bg-glass px-3 py-2 text-(length:--text-control) text-content transition-[background-color,box-shadow] duration-micro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-invalid:ring-1 aria-invalid:ring-danger placeholder:text-muted disabled:cursor-default disabled:opacity-45 pointer-coarse:text-base",
);
export const Textarea = component$<PropsOf<"textarea">>((props) => (
  <textarea {...props} class={cn(textareaVariants(), props.class)} />
));
