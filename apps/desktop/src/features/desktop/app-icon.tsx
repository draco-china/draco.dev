import { component$ } from "@qwik.dev/core";
import { cva } from "class-variance-authority";
import { cn } from "cn";
import type { AppId } from "./state";

const systemAssets: Record<AppId | "home", string> = {
  browser: "safari",
  music: "music",
  settings: "settings",
  code: "code",
  about: "about",
  navigation: "navigation",
  tools: "tools",
  home: "home",
};

const iconVariants = cva(
  "pointer-events-none relative isolate flex shrink-0 items-center justify-center transition-transform duration-panel ease-system",
  {
    variants: {
      dock: {
        true: "size-[51px] max-phone:size-[43px] desktop:[@media(hover:hover)]:group-hover:-translate-y-2 desktop:[@media(hover:hover)]:group-hover:scale-115 reduced:group-hover:translate-y-0 reduced:group-hover:scale-100",
        false: "size-[58px] max-phone:size-[55px]",
      },
    },
    defaultVariants: { dock: false },
  },
);
export const AppIcon = component$<{
  app: AppId | "home";
  dock?: boolean;
  class?: string;
}>((props) => (
  <span class={cn(iconVariants({ dock: props.dock }), props.class)}>
    <img
      src={`/icons/macos/${systemAssets[props.app]}.webp`}
      alt=""
      width={512}
      height={512}
      draggable={false}
      class="size-full object-contain tinted:grayscale"
    />
    <span
      aria-hidden="true"
      data-icon-tint
      class="pointer-events-none absolute inset-0 hidden bg-accent mix-blend-color tinted:block"
      style={{
        maskImage: `url(/icons/macos/${systemAssets[props.app]}.webp)`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
      }}
    />
  </span>
));
