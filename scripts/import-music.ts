import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { parseFile } from "music-metadata";
import { deduplicateMusic } from "./music-dedup";

export function cleanMusicLabel(value: string): string {
  return value
    .replace(/[[【(（]?\s*mo(?:mi|ni)shi\.com\s*分享\s*[\]】)）]?/gi, "")
    .trim();
}

const formats = new Set([
  ".mp3",
  ".m4a",
  ".aac",
  ".flac",
  ".wav",
  ".ogg",
  ".opus",
]);
const imageFormats: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const runFile = promisify(execFile);
const maxStaticBytes = 25 * 1024 * 1024;

async function digest(path: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
async function scan(directory: string, excluded: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const path = join(directory, entry.name);
    if (path === excluded) continue;
    if (entry.isDirectory()) files.push(...(await scan(path, excluded)));
    else if (entry.isFile() && formats.has(extname(entry.name).toLowerCase()))
      files.push(path);
  }
  return files.sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
}

export async function importMusicLibrary(
  sourceDirectory: string,
  targetDirectory: string,
  options: { web?: boolean } = {},
) {
  const source = resolve(sourceDirectory);
  const target = resolve(targetDirectory);
  if (!(await stat(source)).isDirectory()) throw new Error("请选择音乐文件夹");
  if (source === target) throw new Error("源目录与静态输出目录应分别保存");
  const files = await scan(source, target);
  if (!files.length)
    throw new Error("目录中没有支持的音频文件，现有曲库保持原样");
  await mkdir(join(target, "audio"), { recursive: true });
  await mkdir(join(target, "covers"), { recursive: true });
  const hashes = new Set<string>();
  const ids = new Set<number>();
  const songs = [];
  let duplicates = 0;
  for (const file of files) {
    const hash = await digest(file);
    if (hashes.has(hash)) {
      duplicates++;
      continue;
    }
    hashes.add(hash);
    const id = Number.parseInt(hash.slice(0, 12), 16) + 1;
    if (ids.has(id)) throw new Error("歌曲标识发生冲突，现有曲库保持原样");
    ids.add(id);
    const metadata = await parseFile(file, { duration: true });
    if (!metadata.format.duration || !Number.isFinite(metadata.format.duration))
      throw new Error(`无法读取音频时长：${basename(file)}`);
    const extension = extname(file).toLowerCase();
    let audioName = `${hash}${extension}`;
    if (options.web && (await stat(file)).size > maxStaticBytes) {
      audioName = `${hash}-aac256.m4a`;
      const destination = join(target, "audio", audioName);
      const temporaryAudio = `${destination}.tmp.m4a`;
      if (process.platform === "darwin") {
        await runFile("/usr/bin/afconvert", [
          "-f",
          "m4af",
          "-d",
          "aac",
          "-b",
          "256000",
          file,
          temporaryAudio,
        ]);
      } else {
        await runFile("ffmpeg", [
          "-y",
          "-i",
          file,
          "-vn",
          "-c:a",
          "aac",
          "-b:a",
          "256k",
          temporaryAudio,
        ]);
      }
      if ((await stat(temporaryAudio)).size > maxStaticBytes)
        throw new Error(`网页音频仍超过 25 MiB：${basename(file)}`);
      await rename(temporaryAudio, destination);
    } else {
      await copyFile(file, join(target, "audio", audioName));
    }
    let cover = "";
    let picture = metadata.common.picture?.find((p) => imageFormats[p.format]);
    if (!picture) {
      const directory = dirname(file);
      for (const name of [
        `${basename(file, extname(file))}.jpg`,
        `${basename(directory)}.jpg`,
        "cover.jpg",
        "folder.jpg",
      ]) {
        const path = join(directory, name);
        try {
          if ((await stat(path)).size > 10_000_000) continue;
          const data = await readFile(path);
          if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
            picture = { format: "image/jpeg", data };
            break;
          }
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
      }
    }
    if (picture) {
      const coverHash = createHash("sha256").update(picture.data).digest("hex");
      const name = `${coverHash}.${imageFormats[picture.format]}`;
      await writeFile(join(target, "covers", name), picture.data);
      cover = `/music/covers/${name}`;
    }
    const lrc = join(dirname(file), `${basename(file, extname(file))}.lrc`);
    let lyrics = "";
    try {
      if ((await stat(lrc)).size <= 1_000_000)
        lyrics = await readFile(lrc, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    songs.push({
      id,
      title: cleanMusicLabel(
        metadata.common.title || basename(file, extname(file)),
      ),
      artists: cleanMusicLabel(
        metadata.common.artists?.join(" / ") ||
          metadata.common.artist ||
          "许嵩",
      ),
      album: cleanMusicLabel(metadata.common.album || ""),
      cover,
      duration: metadata.format.duration,
      src: `/music/audio/${audioName}`,
      ...(lyrics ? { lyrics } : {}),
    });
  }
  const uniqueSongs = deduplicateMusic(songs);
  duplicates += songs.length - uniqueSongs.length;
  const temporary = join(target, "catalog.json.tmp");
  await writeFile(
    temporary,
    `${JSON.stringify({ version: 1, songs: uniqueSongs }, null, 2)}\n`,
  );
  await rename(temporary, join(target, "catalog.json"));
  return { songs: uniqueSongs.length, duplicates };
}

if (import.meta.main) {
  const source = process.argv.slice(2).find((arg) => arg !== "--web");
  if (!source) throw new Error('用法：bun run music:import "/音乐目录"');
  const result = await importMusicLibrary(
    source,
    resolve(import.meta.dir, "../public/music"),
    { web: process.argv.includes("--web") },
  );
  console.log(
    `已导入 ${result.songs} 首歌曲，合并 ${result.duplicates} 个重复文件`,
  );
}
