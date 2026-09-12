import { component$, useSignal } from "@qwik.dev/core";
import { Button } from "@workspace/ui";
import { Icon } from "@workspace/ui/icon";
import type { Lyric } from "../model";
import { AlbumArt } from "./album-art";
import { ExpandedPlayer } from "./expanded-player";
import { PlayerControls, type PlayerControlsProps } from "./player-controls";
export const MusicPlayer = component$<
  PlayerControlsProps & { lyrics: Lyric[] }
>((p) => {
  const expanded = useSignal(false);
  const song = p.data.queue[p.data.index];
  return (
    <>
      <section
        aria-label="播放器"
        aria-hidden={expanded.value || undefined}
        class="relative z-10 flex shrink-0 items-center gap-3 bg-glass px-4 py-2 shadow-card backdrop-blur-xl @min-[700px]/music:gap-6 @min-[700px]/music:px-5"
        data-music-player
      >
        <button
          type="button"
          aria-label="展开播放器"
          onClick$={() => (expanded.value = true)}
          class="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left @min-[700px]/music:max-w-[28%]"
        >
          <AlbumArt
            src={song?.cover}
            class="size-11 @min-[700px]/music:size-14"
          />
          <span class="min-w-0">
            <strong class="block truncate text-sm font-medium">
              {song?.title || "等待播放"}
            </strong>
            <span class="block truncate text-xs text-muted">
              {song?.artists || "选择一首歌曲"}
            </span>
          </span>
        </button>
        {!expanded.value && (
          <div class="hidden min-w-0 flex-1 @min-[700px]/music:block">
            <PlayerControls {...p} />
          </div>
        )}
        <div class="flex @min-[700px]/music:hidden">
          <Button
            variant="ghost"
            class="size-11 p-0"
            aria-label={p.playing ? "暂停" : "播放"}
            disabled={!song || p.busy}
            onClick$={p.toggle$}
          >
            <Icon name={p.playing ? "pause" : "play"} />
          </Button>
          <Button
            variant="ghost"
            class="size-11 p-0"
            aria-label="下一首"
            disabled={!song}
            onClick$={p.next$}
          >
            <Icon name="next" />
          </Button>
        </div>
      </section>
      {expanded.value && (
        <ExpandedPlayer onClose$={() => (expanded.value = false)}>
          <AlbumArt
            src={song?.cover}
            class="mx-auto aspect-square w-full max-w-[min(320px,35dvh)] rounded-widget shadow-card"
          />
          <div>
            <h3 class="text-2xl font-bold tracking-tight">
              {song?.title || "等待播放"}
            </h3>
            <p class="mt-1 text-sm text-muted">
              {song?.artists || "选择一首歌曲"}
            </p>
          </div>
          <PlayerControls {...p} expanded />
          <section aria-label="歌词" class="space-y-4 text-center text-sm">
            {p.lyrics.length ? (
              p.lyrics.map((line, index) => (
                <p
                  key={`${line.time}-${index}`}
                  class={
                    line.time <= p.data.progress &&
                    (p.lyrics[index + 1]?.time ?? Infinity) > p.data.progress
                      ? "font-semibold text-accent"
                      : "text-muted"
                  }
                >
                  {line.text}
                </p>
              ))
            ) : (
              <p class="text-muted">暂无歌词</p>
            )}
          </section>
        </ExpandedPlayer>
      )}
    </>
  );
});
