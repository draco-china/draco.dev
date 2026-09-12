import { component$, type QRL } from "@qwik.dev/core";
import { Button } from "@workspace/ui";
import { Icon } from "@workspace/ui/icon";
import type { Song } from "../model";
import { AlbumArt } from "./album-art";
export const PlaylistHeader = component$<{
  title: string;
  songs: Song[];
  artist: boolean;
  busy: boolean;
  error: string;
  disabled: boolean;
  onPlay$: QRL<() => unknown>;
  onShuffle$: QRL<() => unknown>;
  onRefresh$: QRL<() => unknown>;
}>((p) => {
  const covers = [
    ...new Set(p.songs.map((song) => song.cover).filter(Boolean)),
  ].slice(0, 4);
  return (
    <header class="mb-7 flex items-end gap-5 @min-[900px]/music:gap-8">
      <div class="grid aspect-square w-28 shrink-0 grid-cols-2 overflow-hidden rounded-widget shadow-card @min-[500px]/music:w-40 @min-[900px]/music:w-52">
        {Array.from({ length: 4 }, (_, i) => (
          <AlbumArt key={i} src={covers[i]} class="size-full rounded-none" />
        ))}
      </div>
      <div class="min-w-0 flex-1">
        <p class="mb-1 text-xs font-medium text-accent">播放列表</p>
        <h2 class="text-2xl font-bold tracking-tight @min-[700px]/music:text-3xl @min-[900px]/music:text-4xl">
          {p.title}
        </h2>
        <p class="mt-2 text-xs text-muted @min-[700px]/music:text-sm">
          {p.artist ? "许嵩 · " : ""}
          {p.songs.length
            ? `${p.songs.length} 首歌曲`
            : p.busy
              ? "正在载入"
              : ""}
        </p>
        <div class="mt-4 flex flex-wrap gap-2 @min-[700px]/music:mt-6">
          <Button
            variant="primary"
            disabled={p.disabled}
            onClick$={p.onPlay$}
            aria-label="播放全部"
          >
            <Icon name="play" size={17} />
            播放
          </Button>
          <Button
            variant="secondary"
            disabled={p.disabled}
            onClick$={p.onShuffle$}
            aria-label="随机播放"
          >
            随机播放
          </Button>
          {p.artist && (
            <Button
              variant="ghost"
              disabled={p.busy}
              onClick$={p.onRefresh$}
              aria-label={p.error ? "重试" : p.busy ? "正在加载" : "刷新"}
            >
              <Icon name="refresh" size={18} />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
});
