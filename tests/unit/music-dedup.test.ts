import { expect, test } from "vitest";
import { deduplicateMusic } from "../../scripts/music-dedup";

const song = {
  title: "歌曲",
  artists: "许嵩",
  album: "专辑",
  duration: 200,
  src: "/one.mp3",
};
test("prefers a lossless copy and keeps named versions or different recordings", () => {
  const lossless = { ...song, src: "/two.flac", duration: 200.1 };
  const live = { ...song, album: "现场", src: "/live.mp3" };
  const alternate = { ...song, duration: 220, src: "/alternate.mp3" };
  expect(deduplicateMusic([song, lossless, live, alternate])).toEqual([
    lossless,
    live,
    alternate,
  ]);
});
test("keeps different artists and is stable across repeated imports", () => {
  const other = { ...song, artists: "其他歌手" };
  const result = deduplicateMusic([song, { ...song }, other]);
  expect(result).toEqual([song, other]);
  expect(deduplicateMusic(result)).toEqual(result);
});
