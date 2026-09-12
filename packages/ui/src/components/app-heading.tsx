import { component$, Slot } from "@qwik.dev/core";
import { cn } from "cn";

export const AppHeading = component$<{
  title: string;
  description?: string;
  class?: string;
}>(({ title, description, class: className }) => (
  <header
    class={cn(
      "mb-6 flex flex-wrap items-start justify-between gap-4",
      className,
    )}
  >
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p class="mt-2 text-sm leading-6 text-muted">{description}</p>
      )}
    </div>
    <Slot />
  </header>
));
