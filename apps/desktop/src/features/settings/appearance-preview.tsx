import { component$ } from "@qwik.dev/core";
import { cva } from "class-variance-authority";

const preview = cva(
  "relative mb-2 block h-[78px] overflow-hidden rounded-control border-[3px] border-transparent group-aria-pressed:outline-2 group-aria-pressed:outline-offset-2 group-aria-pressed:outline-accent",
  {
    variants: {
      mode: {
        light:
          "bg-linear-[130deg,var(--preview-light-start),var(--preview-light-end)]",
        dark: "bg-linear-[130deg,var(--preview-dark-start),var(--preview-dark-end)]",
        system:
          "bg-linear-[100deg,var(--preview-light-start)_50%,var(--preview-system-dark)_50%]",
      },
    },
  },
);
const panel = cva(
  "absolute right-0 -bottom-1 block h-[52px] w-[68%] rounded-tl-control shadow-control",
  {
    variants: {
      mode: {
        light: "bg-(--preview-panel-light)",
        dark: "bg-(--preview-panel-dark)",
        system:
          "bg-linear-[100deg,var(--preview-panel-light)_45%,var(--preview-panel-dark)_45%]",
      },
    },
  },
);
export const AppearancePreview = component$<{
  mode: "light" | "dark" | "system";
}>(({ mode }) => (
  <span class={preview({ mode })} aria-hidden="true">
    <i class={panel({ mode })} />
    <b class="absolute top-[37px] right-[16%] h-1.5 w-[30%] rounded-sm bg-(--preview-text)" />
    <b class="absolute top-[49px] right-[28%] h-1.5 w-[18%] rounded-sm bg-(--preview-text)" />
  </span>
));
