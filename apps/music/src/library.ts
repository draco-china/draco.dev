import { type MusicData, parseLyrics, type Song } from "./model";
export interface StaticSong extends Song {
  src: string;
  lyrics?: string;
}
export interface MusicCatalog {
  version: 1;
  songs: StaticSong[];
}
export type MusicFetcher = (url: URL, init: RequestInit) => Promise<Response>;
function mediaUrl(value: unknown, catalog: URL, required = true): string {
  if (!value && !required) return "";
  if (typeof value !== "string")
    throw new Error("音乐目录格式有误，请重新生成");
  const url = new URL(value, catalog);
  if (
    !/^https?:$/.test(url.protocol) ||
    url.origin !== catalog.origin ||
    url.username ||
    url.password
  )
    throw new Error("音乐文件地址必须与目录同源");
  return url.href;
}
export function createMusicLibrary(
  catalogPath = "/music/catalog.json",
  request: MusicFetcher = fetch,
) {
  const url = new URL(
    catalogPath,
    typeof location === "undefined" ? "http://localhost" : location.origin,
  );
  return {
    async load(): Promise<StaticSong[]> {
      const response = await request(url, {
        credentials: "same-origin",
        signal: AbortSignal.timeout(15000),
        cache: "no-cache",
      });
      if (!response.ok) throw new Error("音乐目录暂时无法加载，请重试");
      const body = await response.json().catch(() => {
        throw new Error("音乐目录格式有误，请重新生成");
      });
      if (body?.version !== 1 || !Array.isArray(body.songs))
        throw new Error("音乐目录格式有误，请重新生成");
      const seen = new Set<number>();
      return body.songs.map((song: StaticSong) => {
        if (
          !song ||
          !Number.isSafeInteger(song.id) ||
          song.id <= 0 ||
          seen.has(song.id) ||
          !Number.isFinite(song.duration) ||
          song.duration < 0 ||
          [song.title, song.artists, song.album].some(
            (value) => typeof value !== "string",
          ) ||
          (song.lyrics !== undefined && typeof song.lyrics !== "string")
        )
          throw new Error("音乐目录格式有误，请重新生成");
        seen.add(song.id);
        return {
          id: song.id,
          title: song.title,
          artists: song.artists,
          album: song.album,
          duration: song.duration,
          src: mediaUrl(song.src, url),
          cover: mediaUrl(song.cover, url, false),
          lyrics: song.lyrics,
        };
      });
    },
  };
}
export function searchSongs(songs: StaticSong[], query: string): StaticSong[] {
  const term = query.trim().toLocaleLowerCase();
  return songs.filter((song) =>
    `${song.title} ${song.artists} ${song.album}`
      .toLocaleLowerCase()
      .includes(term),
  );
}
export function songAudio(songs: StaticSong[], id: number): string {
  const song = songs.find((item) => item.id === id);
  if (!song) throw new Error("这首歌曲已不在音乐目录中");
  return song.src;
}
export function songLyrics(songs: StaticSong[], id: number) {
  return parseLyrics(songs.find((song) => song.id === id)?.lyrics || "");
}
export function alignMusic(data: MusicData, catalog: StaticSong[]): MusicData {
  const byId = new Map(catalog.map((song) => [song.id, song]));
  const align = (songs: Song[]) =>
    songs.flatMap((song) => {
      const actual = byId.get(song.id);
      return actual ? [actual] : [];
    });
  const queue = align(data.queue);
  const current = data.queue[data.index]?.id;
  const index = queue.findIndex((song) => song.id === current);
  return {
    ...data,
    queue,
    recent: align(data.recent),
    index: Math.max(0, index),
    progress:
      index < 0 ? 0 : Math.min(data.progress, queue[index]?.duration || 0),
  };
}
