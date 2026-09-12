import { component$, type PropsOf, Slot } from "@qwik.dev/core";
import { cn } from "cn";

export const Widget = component$<PropsOf<"section">>((props) => (
  <section
    {...props}
    class={cn(
      "@container flex h-full min-h-0 flex-col overflow-hidden rounded-widget bg-glass/55 p-4 text-content shadow-glass backdrop-blur-2xl backdrop-saturate-150",
      props.class,
    )}
  >
    <Slot />
  </section>
));
