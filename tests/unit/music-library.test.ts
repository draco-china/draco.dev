import { describe, expect, it } from "vitest";
import {
  alignMusic,
  createMusicLibrary,
  type StaticSong,
  searchSongs,
  songAudio,
  songLyrics,
} from "../../apps/music/src/library";
import { emptyMusic } from "../../apps/music/src/model";

const song: StaticSong = {
  id: 7,
  title: "歌曲",
  artists: "许嵩",
  album: "专辑",
  cover: "",
  duration: 120,
  src: "/music/song.mp3",
  lyrics: "[00:01]歌词",
};
describe("static music catalog", () => {
  it("loads same-origin static URLs and searches locally", async () => {
    let requests = 0;
    const songs = await createMusicLibrary(
      "https://music.test/music/catalog.json",
      async () => {
        requests++;
        return Response.json({ version: 1, songs: [song] });
      },
    ).load();
    expect(songAudio(songs, 7)).toBe("https://music.test/music/song.mp3");
    expect(searchSongs(songs, "许嵩")).toHaveLength(1);
    expect(songLyrics(songs, 7)).toEqual([{ time: 1, text: "歌词" }]);
    expect(requests).toBe(1);
  });
  it("rejects invalid catalogs and cross-origin audio", async () => {
    for (const entry of [
      { ...song, src: "https://other.test/song.mp3" },
      { ...song, duration: -1 },
    ])
      await expect(
        createMusicLibrary("https://music.test/music/catalog.json", async () =>
          Response.json({ version: 1, songs: [entry] }),
        ).load(),
      ).rejects.toThrow();
    await expect(
      createMusicLibrary("https://music.test/music/catalog.json", async () =>
        Response.json({ version: 1, songs: [song, song] }),
      ).load(),
    ).rejects.toThrow();
  });
  it("aligns old queues to current catalog and retains matching progress", () => {
    const data = {
      ...emptyMusic(),
      queue: [{ ...song, id: 99 }, song],
      index: 1,
      progress: 24,
      recent: [song],
    };
    expect(alignMusic(data, [song])).toMatchObject({
      queue: [song],
      index: 0,
      progress: 24,
    });
    expect(alignMusic(data, [])).toMatchObject({
      queue: [],
      index: 0,
      progress: 0,
      recent: [],
    });
  });
  it("accepts an empty real library", async () =>
    expect(
      await createMusicLibrary(
        "https://music.test/music/catalog.json",
        async () => Response.json({ version: 1, songs: [] }),
      ).load(),
    ).toEqual([]));
});
