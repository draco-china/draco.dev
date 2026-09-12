import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { importMusicLibrary } from "../../scripts/import-music";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "draco-import-test-"));
  roots.push(root);
  const source = join(root, "source");
  const target = join(root, "public", "music");
  await mkdir(source);
  return { source, target };
}
function wav() {
  const samples = 800;
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write("RIFF");
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24);
  bytes.writeUInt32LE(16000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    bytes.writeInt16LE(Math.round(Math.sin(i * 0.35) * 4000), 44 + i * 2);
  return bytes;
}
async function catalog(target: string) {
  return JSON.parse(await readFile(join(target, "catalog.json"), "utf8")) as {
    version: number;
    songs: { id: number; src: string; duration: number; lyrics?: string }[];
  };
}
test("imports real WAV bytes and lyrics, deduplicates copies and keeps IDs stable after a move", async () => {
  const { source, target } = await fixture();
  const audio = wav();
  const lyrics = "[00:00.00]测试歌词\n";
  await writeFile(join(source, "01.wav"), audio);
  await writeFile(join(source, "01.lrc"), lyrics);
  await writeFile(join(source, "02.WAV"), audio);
  expect(await importMusicLibrary(source, target)).toEqual({
    songs: 1,
    duplicates: 1,
  });
  const first = await catalog(target);
  expect(first.version).toBe(1);
  const song = first.songs[0];
  expect(song.duration).toBeCloseTo(0.1);
  expect(song.lyrics).toBe(lyrics);
  expect(song.src).toMatch(/^\/music\/audio\/[a-f0-9]{64}\.wav$/);
  expect(
    await readFile(join(target, song.src.slice("/music/".length))),
  ).toEqual(audio);
  expect(await readFile(join(source, "01.wav"))).toEqual(audio);
  expect(await readFile(join(source, "02.WAV"))).toEqual(audio);
  expect(await readFile(join(source, "01.lrc"), "utf8")).toBe(lyrics);
  await rm(join(source, "02.WAV"));
  await mkdir(join(source, "moved"));
  await rename(join(source, "01.wav"), join(source, "moved", "renamed.wav"));
  await rename(join(source, "01.lrc"), join(source, "moved", "renamed.lrc"));
  expect(await importMusicLibrary(source, target)).toEqual({
    songs: 1,
    duplicates: 0,
  });
  expect((await catalog(target)).songs[0]).toMatchObject({
    id: song.id,
    src: song.src,
    lyrics,
  });
});
test.each(["empty directory", "empty audio", "bad audio"])(
  "%s leaves an existing catalog untouched",
  async (kind) => {
    const { source, target } = await fixture();
    await writeFile(join(source, "valid.wav"), wav());
    await importMusicLibrary(source, target);
    const previous = await readFile(join(target, "catalog.json"));
    await rm(join(source, "valid.wav"));
    if (kind !== "empty directory")
      await writeFile(
        join(source, "invalid.wav"),
        kind === "empty audio" ? "" : "not a WAV file",
      );
    await expect(importMusicLibrary(source, target)).rejects.toThrow();
    expect(await readFile(join(target, "catalog.json"))).toEqual(previous);
    if (kind !== "empty directory")
      expect(await readFile(join(source, "invalid.wav"), "utf8")).toBe(
        kind === "empty audio" ? "" : "not a WAV file",
      );
  },
);

test("a valid file followed by corrupt audio does not publish a partial catalog", async () => {
  const { source, target } = await fixture();
  await writeFile(join(source, "original.wav"), wav());
  await importMusicLibrary(source, target);
  const previous = await readFile(join(target, "catalog.json"));
  await rename(join(source, "original.wav"), join(source, "01-renamed.wav"));
  await writeFile(join(source, "99-corrupt.wav"), "invalid audio");
  await expect(importMusicLibrary(source, target)).rejects.toThrow();
  expect(await readFile(join(target, "catalog.json"))).toEqual(previous);
  expect(await readFile(join(source, "01-renamed.wav"))).toEqual(wav());
  expect(await readFile(join(source, "99-corrupt.wav"), "utf8")).toBe(
    "invalid audio",
  );
});
