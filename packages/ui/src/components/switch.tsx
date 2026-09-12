import { component$, type PropsOf } from "@qwik.dev/core";
import { cva } from "class-variance-authority";
import { cn } from "cn";
export const switchVariants = cva(
  "relative h-5 w-8.5 shrink-0 cursor-pointer disabled:cursor-default disabled:opacity-45 appearance-none rounded-full border-0 bg-control-track p-0 transition-colors duration-micro before:absolute before:left-0.5 before:top-0.5 before:size-4 before:rounded-full before:bg-on-accent before:shadow-control before:transition-transform checked:bg-accent checked:before:translate-x-3.5 pointer-coarse:h-11 pointer-coarse:w-18 pointer-coarse:before:size-9 pointer-coarse:before:left-1 pointer-coarse:before:top-1 pointer-coarse:checked:before:translate-x-7 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
);
export const Switch = component$<PropsOf<"input">>((props) => (
  <input
    {...props}
    type="checkbox"
    role="switch"
    aria-checked={props.checked ?? props["bind:checked"]?.value ?? false}
    class={cn(switchVariants(), props.class)}
  />
));
