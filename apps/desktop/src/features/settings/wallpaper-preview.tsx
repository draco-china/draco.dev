import { component$ } from "@qwik.dev/core";
import { cn } from "cn";

const backgrounds: Record<string, string> = {
  alpine: "bg-[url('/wallpapers/alpine.webp')]",
  dusk: "bg-[url('/wallpapers/alpine.webp')] brightness-53 hue-rotate-20",
  aurora: "bg-(image:--wallpaper-aurora)",
  midnight: "bg-[url('/wallpapers/alpine.webp')] brightness-30 saturate-70",
  sand: "bg-[url('/wallpapers/alpine.webp')] sepia-50",
};
export const WallpaperPreview = component$<{
  wallpaper: { id: string; url?: string };
}>(({ wallpaper }) => (
  <span
    class={cn(
      "mb-2 block h-[70px] rounded-control bg-cover bg-center group-aria-pressed:outline-2 group-aria-pressed:outline-offset-2 group-aria-pressed:outline-accent",
      backgrounds[wallpaper.id],
    )}
    style={
      wallpaper.url
        ? { backgroundImage: `url(${JSON.stringify(wallpaper.url)})` }
        : undefined
    }
  />
));
