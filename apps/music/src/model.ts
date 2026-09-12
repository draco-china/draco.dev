export interface Song {
  id: number;
  title: string;
  artists: string;
  album: string;
  cover: string;
  duration: number;
}
export interface Lyric {
  time: number;
  text: string;
}
export type PlayMode = "sequence" | "repeat" | "shuffle";
export interface MusicData {
  version: 1;
  queue: Song[];
  recent: Song[];
  index: number;
  progress: number;
  volume: number;
  mode: PlayMode;
}
export const emptyMusic = (): MusicData => ({
  version: 1,
  queue: [],
  recent: [],
  index: 0,
  progress: 0,
  volume: 0.7,
  mode: "sequence",
});

export function parseLyrics(text: string): Lyric[] {
  return text
    .split("\n")
    .flatMap((line) => {
      const content = line.replace(/\[[^\]]*\]/g, "").trim();
      return [...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)].map((m) => ({
        time: Number(m[1]) * 60 + Number(m[2]),
        text: content,
      }));
    })
    .filter((l) => l.text)
    .sort((a, b) => a.time - b.time);
}
export function nextIndex(
  index: number,
  length: number,
  mode: PlayMode,
  random = Math.random(),
): number {
  if (length < 2 || mode === "repeat") return Math.max(0, index);
  if (mode === "shuffle")
    return (
      (index +
        1 +
        Math.floor(Math.min(0.999999, Math.max(0, random)) * (length - 1))) %
      length
    );
  return (index + 1) % length;
}
export function validMusic(value: unknown): MusicData {
  const initial = emptyMusic();
  if (!value || typeof value !== "object") return initial;
  const v = value as Partial<MusicData>;
  const songs = (items: unknown): Song[] =>
    Array.isArray(items)
      ? items
          .filter(
            (s): s is Song =>
              !!s &&
              Number.isSafeInteger(s.id) &&
              s.id > 0 &&
              typeof s.title === "string" &&
              typeof s.artists === "string" &&
              typeof s.album === "string" &&
              typeof s.cover === "string" &&
              Number.isFinite(s.duration) &&
              s.duration >= 0,
          )
          .slice(0, 1000)
      : [];
  const queue = songs(v.queue);
  return {
    ...initial,
    queue,
    recent: songs(v.recent).slice(0, 100),
    index: Number.isInteger(v.index)
      ? Math.max(0, Math.min(v.index ?? 0, queue.length - 1))
      : 0,
    progress:
      typeof v.progress === "number" && Number.isFinite(v.progress)
        ? Math.max(0, v.progress)
        : 0,
    volume:
      typeof v.volume === "number" && Number.isFinite(v.volume)
        ? Math.min(1, Math.max(0, v.volume))
        : 0.7,
    mode: v.mode === "shuffle" || v.mode === "repeat" ? v.mode : "sequence",
  };
}
export function formatTime(seconds: number): string {
  const n = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}
