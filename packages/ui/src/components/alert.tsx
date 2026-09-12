import { component$, type PropsOf, Slot } from "@qwik.dev/core";
import { cva } from "class-variance-authority";
import { cn } from "cn";
export const alertVariants = cva(
  "my-2.5 rounded-control p-3 text-(length:--text-control) leading-relaxed",
  {
    variants: {
      tone: {
        error: "bg-danger/10 text-danger",
        success: "bg-success/10 text-success",
        info: "bg-info/10 text-content",
      },
    },
    defaultVariants: { tone: "info" },
  },
);
export const Alert = component$<
  PropsOf<"div"> & { tone?: "error" | "success" | "info" }
>(({ tone = "info", ...props }) => (
  <div
    {...props}
    class={cn(alertVariants({ tone }), props.class)}
    aria-live={tone === "error" ? "assertive" : "polite"}
  >
    <Slot />
  </div>
));
