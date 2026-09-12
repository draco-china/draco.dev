import type { BrowserCommand } from "vitest/node";
import "@vitest/browser-playwright";

const pendingArtists = new WeakMap<object, () => void>();
const patterns = [
  "https://music-fixture.test/**",
  "**/music/catalog.json",
  "**/audio.wav",
  "**/unavailable.wav",
];
export const musicFixture: BrowserCommand<
  [enabled: boolean, artistFailure?: boolean, holdArtist?: boolean]
> = async ({ context }, enabled, artistFailure = false, holdArtist = false) => {
  pendingArtists.get(context)?.();
  pendingArtists.delete(context);
  for (const pattern of patterns) await context.unroute(pattern);
  if (!enabled) return;
  // Generated PCM WAV; no remote recording or codec mock is involved.
  const rate = 8000,
    samples = rate * 12;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    wav.writeInt16LE(
      Math.round(Math.sin((i / rate) * 2 * Math.PI * 220) * 100),
      44 + i * 2,
    );
  const artistReady = holdArtist
    ? new Promise<void>((resolve) => pendingArtists.set(context, resolve))
    : Promise.resolve();
  let failArtist = artistFailure;
  for (const pattern of patterns)
    await context.route(pattern, async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/audio.wav") {
        await route.fulfill({
          status: 200,
          contentType: "audio/wav",
          body: wav,
        });
        return;
      }
      const headers = { "access-control-allow-origin": "*" };
      if (url.pathname === "/unavailable.wav") {
        await route.fulfill({ status: 404, headers, body: "missing" });
        return;
      }
      if (
        url.pathname !== "/catalog.json" &&
        url.pathname !== "/music/catalog.json"
      ) {
        await route.fulfill({ status: 404, headers, body: "missing" });
        return;
      }
      await artistReady;
      if (failArtist) {
        failArtist = false;
        await route.fulfill({ status: 503, headers, body: "unavailable" });
        return;
      }
      const songs = [
        { id: 11, title: "许嵩测试歌曲", artists: "许嵩", album: "测试专辑" },
        { id: 13, title: "许嵩第二首", artists: "许嵩", album: "测试专辑" },
        { id: 1, title: "Fixture song", artists: "Generated", album: "Test" },
        {
          id: 2,
          title: "Unavailable song",
          artists: "Generated",
          album: "Test",
        },
      ].map((song) => ({
        ...song,
        cover: "",
        duration: 12,
        src: song.id === 2 ? "/unavailable.wav" : "/audio.wav",
        lyrics: "[00:00.00]Generated lyric",
      }));
      await route.fulfill({
        status: 200,
        headers,
        contentType: "application/json",
        body: JSON.stringify({ version: 1, songs }),
      });
    });
};
export const emptyMusicCatalog: BrowserCommand<[]> = async ({ context }) => {
  await context.unroute("**/music/catalog.json");
  await context.route("**/music/catalog.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: 1, songs: [] }),
    }),
  );
};
export const releaseArtist: BrowserCommand<[]> = async ({ context }) => {
  pendingArtists.get(context)?.();
  pendingArtists.delete(context);
};

declare module "vitest/browser" {
  interface BrowserCommands {
    musicFixture(
      enabled: boolean,
      artistFailure?: boolean,
      holdArtist?: boolean,
    ): Promise<void>;
    releaseArtist(): Promise<void>;
    emptyMusicCatalog(): Promise<void>;
  }
}
