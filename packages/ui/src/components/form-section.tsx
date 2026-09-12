import { component$, type PropsOf, Slot } from "@qwik.dev/core";
import { cn } from "cn";
export const FormSection = component$<
  PropsOf<"section"> & { title?: string; description?: string }
>(({ title, description, ...props }) => (
  <section
    {...props}
    class={cn(
      "mb-5 rounded-panel bg-surface shadow-card p-4 sm:px-5 [&>h2]:mb-4 [&>h2]:text-(length:--text-control) [&>h2]:font-semibold",
      props.class,
    )}
  >
    {title && <h2>{title}</h2>}
    {description && <p class="text-xs text-muted">{description}</p>}
    <Slot />
  </section>
));
