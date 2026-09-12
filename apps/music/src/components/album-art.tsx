import { component$, useSignal } from "@qwik.dev/core";
import { Icon } from "@workspace/ui/icon";
import { cn } from "cn";
export const AlbumArt = component$<{ src?: string; class?: string }>(
  ({ src, class: className }) => {
    const failed = useSignal("");
    return (
      <span
        class={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-control bg-accent/10 text-accent",
          className,
        )}
      >
        {src && failed.value !== src ? (
          <img
            src={src}
            width={320}
            height={320}
            alt=""
            loading="lazy"
            class="absolute inset-0 size-full object-cover"
            onError$={() => (failed.value = src)}
          />
        ) : (
          <Icon name="music" size={30} />
        )}
      </span>
    );
  },
);
