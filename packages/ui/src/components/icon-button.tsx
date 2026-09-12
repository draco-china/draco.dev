import { component$, Slot } from "@qwik.dev/core";
import { cva } from "class-variance-authority";
import { cn } from "cn";
import { Button, type ButtonProps } from "./button";
export const iconButtonVariants = cva("aspect-square p-0", {
  variants: { size: { sm: "size-7", md: "size-8.5", lg: "size-10.5" } },
  defaultVariants: { size: "md" },
});
export const IconButton = component$<ButtonProps>(
  ({ variant = "ghost", size = "md", ...props }) => (
    <Button
      {...props}
      variant={variant}
      size={size}
      class={cn(iconButtonVariants({ size }), props.class)}
    >
      <Slot />
    </Button>
  ),
);
