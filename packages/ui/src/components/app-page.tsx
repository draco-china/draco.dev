import { component$, type PropsOf, Slot } from "@qwik.dev/core";
import { cn } from "cn";

export const AppPage = component$<PropsOf<"div">>((props) => (
  <div
    {...props}
    data-ui="app-page"
    class={cn(
      "mx-auto flex w-full max-w-4xl flex-col gap-6 p-5 text-content sm:p-7",
      props.class,
    )}
  >
    <Slot />
  </div>
));
