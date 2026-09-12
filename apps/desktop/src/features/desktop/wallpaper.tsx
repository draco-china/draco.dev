import { component$, useSignal, useVisibleTask$ } from "@qwik.dev/core";
import { cva } from "class-variance-authority";

const wallpaperVariants = cva(
  "pointer-events-none absolute inset-0 bg-cover bg-center",
  {
    variants: {
      appearance: {
        alpine: "bg-[url('/wallpapers/alpine.webp')]",
        dusk: "bg-[url('/wallpapers/alpine.webp')] brightness-53 hue-rotate-20",
        midnight:
          "bg-[url('/wallpapers/alpine.webp')] brightness-30 saturate-70",
        sand: "bg-[url('/wallpapers/alpine.webp')] sepia-50",
        aurora: "bg-(image:--wallpaper-aurora)",
      },
    },
  },
);
export const Wallpaper = component$<{ appearance: string; url?: string }>(
  (props) => {
    const surface = useSignal<HTMLDivElement>();
    useVisibleTask$(({ track, cleanup }) => {
      const appearance = track(() => props.appearance);
      const url = track(() => props.url);
      const root = surface.value;
      if (!root) return;
      const layer = document.createElement("div");
      layer.className = wallpaperVariants({
        appearance:
          appearance in { alpine: 1, dusk: 1, midnight: 1, sand: 1, aurora: 1 }
            ? (appearance as "alpine" | "dusk" | "midnight" | "sand" | "aurora")
            : "alpine",
      });
      if (url) layer.style.backgroundImage = `url(${JSON.stringify(url)})`;
      const previous = [...root.children];
      root.append(layer);
      const reduced =
        document.documentElement.classList.contains("reduce-motion");
      const animation = layer.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: previous.length ? (reduced ? 80 : 360) : 0,
        easing: "ease-out",
        fill: "forwards",
      });
      void animation.finished
        .then(() => {
          for (const item of previous) item.remove();
        })
        .catch(() => {});
      cleanup(() => {
        // Retain the current blended frame underneath the next incoming layer.
        if (animation.playState === "running") animation.commitStyles();
        animation.cancel();
      });
    });
    return (
      <>
        <div
          ref={surface}
          aria-hidden="true"
          class="pointer-events-none fixed inset-0 -z-20 overflow-hidden bg-cover bg-center bg-[url('/wallpapers/alpine.webp')]"
        />
        <div class="pointer-events-none fixed inset-0 -z-10 bg-linear-[0deg,var(--wallpaper-overlay-start),var(--wallpaper-overlay-end)] transition-colors duration-window dark:bg-(--wallpaper-overlay-dark)" />
      </>
    );
  },
);
