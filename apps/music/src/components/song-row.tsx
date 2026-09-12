import { component$, type QRL } from "@qwik.dev/core";
import { cva } from "class-variance-authority";
import type { Song } from "../model";
import { formatTime } from "../model";
import { AlbumArt } from "./album-art";

const row = cva(
  "group flex min-h-16 items-center gap-3 rounded-control px-2 py-2 text-sm transition-colors",
  {
    variants: {
      active: { true: "bg-content/5", false: "hover:bg-content/[.035]" },
    },
  },
);
export const SongRow = component$<{
  song: Song;
  index: number;
  active: boolean;
  disabled: boolean;
  onPlay$: QRL<() => unknown>;
}>((p) => (
  <li class={row({ active: p.active })}>
    <span
      class={
        p.active
          ? "w-5 shrink-0 text-center text-accent"
          : "w-5 shrink-0 text-center text-xs text-muted"
      }
    >
      {p.active ? "♫" : p.index + 1}
    </span>
    <AlbumArt src={p.song.cover} class="size-10" />
    <button
      type="button"
      disabled={p.disabled}
      class="min-h-11 min-w-0 flex-1 text-left disabled:opacity-50"
      onClick$={p.onPlay$}
    >
      <span class="block truncate font-medium">{p.song.title}</span>
      <span class="block truncate text-xs text-muted">
        {p.song.artists} · {p.song.album}
      </span>
    </button>
    <span class="hidden w-[25%] truncate text-xs text-muted @min-[900px]/music:block">
      {p.song.album}
    </span>
    <span class="text-xs tabular-nums text-muted">
      {formatTime(p.song.duration)}
    </span>
  </li>
));
