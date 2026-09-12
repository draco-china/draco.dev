import {
  $,
  component$,
  type NoSerialize,
  noSerialize,
  untrack,
  useSignal,
  useStore,
  useTask$,
  useVisibleTask$,
} from "@qwik.dev/core";
import type { AppContentProps } from "@workspace/app-sdk";
import { Button, Input } from "@workspace/ui";
import { Icon } from "@workspace/ui/icon";
import { MusicPlayer } from "./components/music-player";
import { PlaylistHeader } from "./components/playlist-header";
import { SongRow } from "./components/song-row";
import { featuredArtist } from "./featured-artist";
import {
  alignMusic,
  createMusicLibrary,
  type StaticSong,
  searchSongs,
  songAudio,
  songLyrics,
} from "./library";
import {
  emptyMusic,
  type Lyric,
  nextIndex,
  type PlayMode,
  type Song,
} from "./model";
import { attachPlayer } from "./player-bridge";
import { readMusic, saveMusic } from "./storage";

export default component$<AppContentProps & { catalogUrl?: string }>(
  ({ host, catalogUrl }) => {
    const data = useStore(emptyMusic());
    const state = useStore({
      query: "",
      view: "playlist",
      results: [] as Song[],
      artistSongs: [] as StaticSong[],
      artistBusy: false,
      artistError: "",
      artistAttempt: 0,
      artistLoaded: false,
      title: "搜索歌曲",
      error: "",
      busy: false,
      playing: false,
      source: "",
      lyrics: [] as Lyric[],
      sessionOnly: false,
      request: 0,
      persistedAt: 0,
      restorePosition: 0,
      restoring: true,
    });
    const audio = useSignal<HTMLAudioElement>();
    const playerBridge =
      useSignal<NoSerialize<ReturnType<typeof attachPlayer>>>();
    const autoAttempted = useSignal(false);
    const catalogPath = catalogUrl ?? "/music/catalog.json";
    const persist = $(async () => {
      if (state.restoring) return;
      try {
        await saveMusic(data);
        state.persistedAt = data.progress;
      } catch {
        state.sessionOnly = true;
      }
    });
    // CSR initialization must not restart when a hidden module becomes visible.
    useTask$(({ cleanup }) => {
      let alive = true;
      async function restore() {
        const generation = ++state.request;
        state.restoring = true;
        audio.value?.pause();
        state.source = "";
        state.lyrics = [];
        try {
          const saved = await readMusic();
          if (alive && generation === state.request) Object.assign(data, saved);
        } catch {
          if (alive) state.sessionOnly = true;
        } finally {
          if (alive && generation === state.request) state.restoring = false;
        }
      }
      untrack(() => void restore());
      cleanup(() => {
        alive = false;
        audio.value?.pause();
      });
    });
    useVisibleTask$(
      ({ track, cleanup }) => {
        track(() => state.artistAttempt);

        let alive = true;
        cleanup(() => {
          alive = false;
        });
        state.artistBusy = true;
        state.artistError = "";
        void createMusicLibrary(catalogPath)
          .load()
          .then((songs) => {
            if (alive) {
              state.artistSongs = songs;
              state.artistLoaded = true;
            }
          })
          .catch((error: unknown) => {
            if (alive)
              state.artistError =
                error instanceof Error
                  ? error.message
                  : "歌曲库加载失败，请重试";
          })
          .finally(() => {
            if (alive) state.artistBusy = false;
          });
      },
      { strategy: "document-ready" },
    );
    const started = $(async (song: Song, generation: number) => {
      state.error = "";
      data.recent = [
        song,
        ...data.recent.filter((s) => s.id !== song.id),
      ].slice(0, 100);
      await host.setTitle$(`${song.title} · 音乐`);
      await persist();
      if (generation === state.request)
        state.lyrics = songLyrics(state.artistSongs, song.id);
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title,
          artist: song.artists,
          album: song.album,
        });
      }
    });
    const play = $(async (index: number) => {
      const song = data.queue[index];
      if (!song || !state.artistLoaded || state.restoring) return;
      const generation = ++state.request;
      data.index = index;
      state.error = "";
      state.busy = true;
      audio.value?.pause();
      state.source = "";
      state.restorePosition = data.progress;
      try {
        const source = songAudio(state.artistSongs, song.id);
        if (generation !== state.request) return;
        state.source = source;
        state.lyrics = [];
        if (audio.value) {
          audio.value.src = source;
          audio.value.volume = data.volume;
          await audio.value.play();
        }
        await started(song, generation);
      } catch (error) {
        if (generation === state.request)
          state.error =
            error instanceof Error && error.name === "NotAllowedError"
              ? "点击播放，开始聆听"
              : error instanceof Error
                ? error.message
                : "播放失败，请重试";
      } finally {
        if (generation === state.request) state.busy = false;
      }
    });
    useVisibleTask$(
      ({ track }) => {
        const visible = track(() => host.visible) || host.mode === "desktop";
        const restoring = track(() => state.restoring);
        const loaded = track(() => state.artistLoaded);
        const catalog = track(() => state.artistSongs);
        untrack(() => {
          if (!visible || restoring) {
            autoAttempted.value = false;
            return;
          }
          if (!loaded) return;
          Object.assign(data, alignMusic(data, catalog));
          void persist();
          if (autoAttempted.value) return;
          if (!data.queue.length) {
            if (!state.artistSongs.length) return;
            data.queue = [...state.artistSongs];
            data.index = Math.floor(Math.random() * data.queue.length);
            data.progress = 0;
          }
          autoAttempted.value = true;
          if (audio.value?.paused && !state.busy) void play(data.index);
        });
      },
      { strategy: "document-ready" },
    );
    const next = $(async () => {
      data.progress = 0;
      await play(nextIndex(data.index, data.queue.length, data.mode));
    });
    const previous = $(async () => {
      data.progress = 0;
      await play((data.index - 1 + data.queue.length) % data.queue.length);
    });
    const toggle = $(async () => {
      if (!audio.value) return;
      if (!audio.value.paused) {
        data.progress = audio.value.currentTime;
        audio.value.pause();
        await persist();
      } else if (state.source) {
        try {
          await audio.value.play();
          const song = data.queue[data.index];
          if (song) await started(song, state.request);
        } catch {
          state.error = "请再次点击播放";
        }
      } else await play(data.index);
    });
    useTask$(({ cleanup }) => {
      const bridge = untrack(() =>
        attachPlayer({
          toggle: async () => {
            await toggle();
          },
          previous: async () => {
            await previous();
          },
          next: async () => {
            await next();
          },
          seek: async (seconds) => {
            data.progress = seconds;
            if (audio.value && state.source) audio.value.currentTime = seconds;
            await persist();
          },
        }),
      );
      playerBridge.value = noSerialize(bridge);
      cleanup(() => {
        bridge.dispose();
        playerBridge.value = undefined;
      });
    });
    useVisibleTask$(
      ({ track }) => {
        const bridge = track(() => playerBridge.value);
        const song = track(() => data.queue[data.index]);
        const playing = track(() => state.playing);
        const progress = track(() => data.progress);
        const message = track(() => state.error || state.artistError);
        if (!bridge) return;
        bridge.update({
          title: song?.title || "",
          artist: song?.artists || "",
          cover: song?.cover || "",
          playing,
          message,
          progress,
          duration: song?.duration || 0,
        });
      },
      { strategy: "document-ready" },
    );
    useVisibleTask$(({ cleanup }) => {
      if (!("mediaSession" in navigator)) return;
      navigator.mediaSession.setActionHandler("play", () => {
        if (!state.playing) void toggle();
      });
      navigator.mediaSession.setActionHandler("pause", () =>
        audio.value?.pause(),
      );
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        void next();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        void previous();
      });
      cleanup(() => {
        for (const action of [
          "play",
          "pause",
          "nexttrack",
          "previoustrack",
        ] as const)
          navigator.mediaSession.setActionHandler(action, null);
      });
    });
    const search = $(async () => {
      if (!state.query.trim()) {
        state.view = "playlist";
        return;
      }
      state.busy = true;
      state.error = "";
      try {
        state.results = searchSongs(state.artistSongs, state.query.trim());
        state.title = `“${state.query.trim()}”的搜索结果`;
        state.view = "search";
      } catch (error) {
        state.error = error instanceof Error ? error.message : "搜索失败";
      } finally {
        state.busy = false;
      }
    });
    const current = data.queue[data.index];
    const songs = state.view === "search" ? state.results : state.artistSongs;
    const title = state.view === "search" ? state.title : featuredArtist.name;
    const playList = $(async (shuffle = false) => {
      if (!songs.length || state.restoring) return;
      data.queue = [...songs];
      data.progress = 0;
      data.mode = shuffle ? "shuffle" : "sequence";
      await play(shuffle ? Math.floor(Math.random() * songs.length) : 0);
    });
    return (
      <div
        class="@container/music relative flex h-full min-h-0 flex-col bg-transparent text-content"
        data-music-app
      >
        <div class="flex min-h-0 flex-1 flex-col">
          <header
            class="flex shrink-0 items-center gap-2 px-5 pt-4"
            data-music-search
          >
            <form
              class="relative min-w-0 flex-1"
              preventdefault:submit
              onSubmit$={search}
            >
              <Input
                class="w-full pr-12"
                aria-label="搜索歌曲"
                placeholder="歌曲、歌手"
                value={state.query}
                onInput$={(_, el) => (state.query = el.value)}
              />
              <Button
                variant="ghost"
                type="submit"
                aria-label="搜索"
                class="absolute right-0.5 top-1/2 size-10 -translate-y-1/2 p-0"
                disabled={state.busy}
              >
                <Icon name="search" size={19} />
              </Button>
            </form>
          </header>
          <main
            class="min-h-0 flex-1 overflow-auto overscroll-contain px-5 py-6 @min-[900px]/music:px-8"
            data-music-library
          >
            {state.sessionOnly && (
              <p role="status" class="mb-4 text-xs text-muted">
                浏览器存储暂时不可用，本次修改保留在当前会话
              </p>
            )}
            {state.error && (
              <div
                role="alert"
                class="mb-5 rounded-control bg-danger/10 p-3 text-sm text-danger"
              >
                {state.error}
                <div class="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!current}
                    onClick$={() => play(data.index)}
                  >
                    重试播放
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!current}
                    onClick$={next}
                  >
                    下一首
                  </Button>
                </div>
              </div>
            )}
            <section
              aria-busy={
                state.view === "playlist" ? state.artistBusy : state.busy
              }
            >
              <PlaylistHeader
                title={title}
                songs={songs}
                artist={state.view === "playlist"}
                busy={state.artistBusy}
                error={state.artistError}
                disabled={!songs.length || state.restoring || state.busy}
                onPlay$={() => playList()}
                onShuffle$={() => playList(true)}
                onRefresh$={() => state.artistAttempt++}
              />
              {state.view === "playlist" && state.artistError && (
                <p role="alert" class="mb-4 text-sm text-danger">
                  {state.artistError}
                </p>
              )}
              <div
                class="mb-2 flex items-center gap-3 px-2 text-xs text-muted"
                aria-hidden="true"
              >
                <span class="w-5 text-center">#</span>
                <span class="flex-1">标题</span>
                <span class="hidden w-[25%] @min-[900px]/music:block">
                  专辑
                </span>
                <span class="pr-2">时长</span>
              </div>
              {songs.length ? (
                <ul>
                  {songs.map((song, index) => (
                    <SongRow
                      key={song.id}
                      song={song}
                      index={index}
                      active={current?.id === song.id}
                      disabled={state.restoring}
                      onPlay$={async () => {
                        data.queue = [...songs];
                        data.progress = 0;
                        await play(index);
                      }}
                    />
                  ))}
                </ul>
              ) : (
                <p class="py-8 text-sm text-muted">
                  {state.view === "playlist" && state.artistBusy
                    ? "正在载入许嵩的播放列表"
                    : state.busy
                      ? "正在搜索音乐"
                      : state.view === "playlist" && state.artistError
                        ? ""
                        : state.view === "playlist"
                          ? "音乐文件准备好后会出现在这里"
                          : "没有找到匹配的歌曲"}
                </p>
              )}
            </section>
          </main>
        </div>
        <MusicPlayer
          data={data}
          playing={state.playing}
          busy={state.busy}
          source={state.source}
          lyrics={state.lyrics}
          toggle$={toggle}
          previous$={previous}
          next$={next}
          persist$={persist}
          seek$={(seconds) => {
            data.progress = seconds;
            if (audio.value) audio.value.currentTime = seconds;
          }}
          volume$={(volume) => {
            data.volume = volume;
            if (audio.value) audio.value.volume = volume;
          }}
          mode$={async (mode: PlayMode) => {
            data.mode = mode;
            await persist();
          }}
        />
        {/* biome-ignore lint/a11y/useMediaCaption: Synchronized lyrics are rendered in the accessible lyrics section above. */}
        <audio
          ref={audio}
          preload="metadata"
          onPlay$={() => {
            state.playing = true;
          }}
          onPause$={async () => {
            state.playing = false;
            if (audio.value && state.source)
              data.progress = audio.value.currentTime;
            await persist();
          }}
          onEnded$={next}
          onError$={() => {
            if (state.source) {
              audio.value?.pause();
              state.playing = false;
              state.error = "音频加载失败，请重试或播放下一首";
            }
          }}
          onLoadedMetadata$={() => {
            if (audio.value && state.restorePosition > 0)
              audio.value.currentTime = Math.min(
                state.restorePosition,
                audio.value.duration || 0,
              );
          }}
          onTimeUpdate$={async () => {
            if (audio.value) data.progress = audio.value.currentTime;
            if (Math.abs(data.progress - state.persistedAt) >= 5)
              await persist();
          }}
          onSeeked$={persist}
        />
      </div>
    );
  },
);
