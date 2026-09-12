import {
  component$,
  type QRL,
  useComputed$,
  useSignal,
  useVisibleTask$,
} from "@qwik.dev/core";
import {
  nextPlayer,
  previousPlayer,
  readPlayer,
  subscribePlayer,
  togglePlayer,
} from "@workspace/music/player-bridge";
import { IconButton, Widget } from "@workspace/ui";
import { Icon } from "@workspace/ui/icon";
import { appRegistry } from "../app-registry";
import type { AppId } from "../state";
export const MusicWidget = component$<{
  open: QRL<(id: AppId, stamp?: number) => Promise<void>>;
}>(({ open }) => {
  const snapshot = useSignal(readPlayer());
  const local = appRegistry.music.kind === "module";
  useVisibleTask$(({ cleanup }) => {
    if (local)
      cleanup(
        subscribePlayer((value) => {
          snapshot.value = value;
        }),
      );
  });
  const active = useComputed$(
    () => local && snapshot.value.connected && !!snapshot.value.title,
  );
  return (
    <Widget
      aria-label="音乐小组件"
      class="@container/musicwidget relative isolate justify-center gap-1 rounded-panel bg-glass/70 px-3 py-2.5 short-screen:py-1.5"
    >
      <button
        type="button"
        aria-label="打开音乐"
        data-widget-open
        class="absolute inset-0 z-0 rounded-[inherit] border-0 bg-transparent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        onClick$={(event) => open("music", event.timeStamp)}
      />
      <div class="pointer-events-none flex min-h-0 items-center gap-2 @max-[200px]/musicwidget:grid @max-[200px]/musicwidget:grid-cols-[28px_minmax(0,1fr)] @max-[200px]/musicwidget:justify-center @max-[200px]/musicwidget:gap-y-1">
        <div class="flex size-11 @max-[200px]/musicwidget:size-7 shrink-0 items-center justify-center overflow-hidden rounded-control bg-accent/15 text-accent">
          {active.value && snapshot.value.cover ? (
            <img
              width={44}
              height={44}
              src={snapshot.value.cover}
              alt=""
              class="size-full object-cover"
            />
          ) : (
            <Icon name="music" size={24} />
          )}
        </div>
        <div class="min-w-0 flex-1">
          <p class="block w-full truncate text-left text-sm font-medium @max-[200px]/musicwidget:text-center @max-[200px]/musicwidget:text-xs @max-[200px]/musicwidget:leading-tight">
            {active.value ? snapshot.value.title : "音乐"}
            {active.value && snapshot.value.artist && (
              <span class="font-normal text-muted">
                {" "}
                · {snapshot.value.artist}
              </span>
            )}
          </p>
          <div class="mt-1 flex items-center gap-1.5 @max-[200px]/musicwidget:justify-center">
            {active.value && (
              <span
                role="timer"
                aria-live="off"
                aria-label="已播放时间"
                class="shrink-0 text-[10px] tabular-nums text-muted @max-[200px]/musicwidget:leading-tight"
              >
                {`${Math.floor(snapshot.value.progress / 60)
                  .toString()
                  .padStart(2, "0")}:${Math.floor(snapshot.value.progress % 60)
                  .toString()
                  .padStart(2, "0")}`}
              </span>
            )}
          </div>
        </div>
        {active.value && (
          <div class="pointer-events-auto relative z-10 flex h-8 shrink-0 items-center gap-0 @max-[200px]/musicwidget:col-span-full @max-[200px]/musicwidget:justify-center @max-[200px]/musicwidget:gap-1">
            <IconButton
              size="sm"
              class="size-8"
              aria-label="上一首音乐"
              disabled={!active.value}
              onClick$={previousPlayer}
            >
              <Icon name="previous" size={15} />
            </IconButton>
            <IconButton
              size="sm"
              class="size-8"
              aria-label={
                active.value
                  ? snapshot.value.playing
                    ? "暂停音乐"
                    : "播放音乐"
                  : "选择播放音乐"
              }
              onClick$={async (event) => {
                if (active.value) await togglePlayer();
                else await open("music", event.timeStamp);
              }}
            >
              <Icon
                name={active.value && snapshot.value.playing ? "pause" : "play"}
                size={17}
              />
            </IconButton>
            <IconButton
              size="sm"
              class="size-8"
              aria-label="下一首音乐"
              disabled={!active.value}
              onClick$={nextPlayer}
            >
              <Icon name="next" size={15} />
            </IconButton>
          </div>
        )}
      </div>
    </Widget>
  );
});
