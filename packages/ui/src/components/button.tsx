import { component$, type PropsOf, Slot } from "@qwik.dev/core";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Spinner } from "./spinner";
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-control border-0 text-(length:--text-control) font-medium transition-[background,opacity,transform] duration-micro active:enabled:scale-97 disabled:cursor-default disabled:opacity-45 pointer-coarse:min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent",
        secondary: "bg-glass text-content hover:enabled:bg-content/10",
        ghost: "bg-transparent text-content hover:enabled:bg-content/5",
        danger: "bg-danger text-on-danger",
      },
      size: {
        sm: "min-h-7 px-2 py-1 text-xs",
        md: "min-h-8.5 px-3 py-2",
        lg: "min-h-10.5 px-4 py-3",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
export type ButtonProps = PropsOf<"button"> &
  VariantProps<typeof buttonVariants> & { loading?: boolean };
export const Button = component$<ButtonProps>(
  ({ variant, size, loading = false, ...props }) => (
    <button
      {...props}
      type={props.type || "button"}
      class={cn(buttonVariants({ variant, size }), props.class)}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <Spinner />}
      <Slot />
    </button>
  ),
);
