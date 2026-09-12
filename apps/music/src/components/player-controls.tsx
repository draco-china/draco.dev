import { component$, type QRL } from "@qwik.dev/core";
import { Button, Select, Slider } from "@workspace/ui";
import { Icon } from "@workspace/ui/icon";
import { cn } from "cn";
import { formatTime, type MusicData, type PlayMode } from "../model";
export interface PlayerControlsProps {
  data: MusicData;
  playing: boolean;
  busy: boolean;
  source: string;
  expanded?: boolean;
  toggle$: QRL<() => unknown>;
  previous$: QRL<() => unknown>;
  next$: QRL<() => unknown>;
  seek$: QRL<(seconds: number) => unknown>;
  volume$: QRL<(volume: number) => unknown>;
  mode$: QRL<(mode: PlayMode) => unknown>;
  persist$: QRL<() => unknown>;
}
export const PlayerControls = component$<PlayerControlsProps>((p) => (
  <div
    class={cn(
      "min-w-0",
      p.expanded
        ? "space-y-4"
        : "grid grid-cols-[1fr_auto] items-center gap-x-5",
    )}
  >
    <div class="flex min-w-0 flex-col">
      <div class="flex items-center justify-center gap-3">
        <Button
          variant="ghost"
          class="size-11 p-0"
          aria-label="上一首"
          disabled={!p.data.queue.length}
          onClick$={p.previous$}
        >
          <Icon name="previous" size={22} />
        </Button>
        <Button
          variant="ghost"
          class={cn(
            "rounded-full p-0",
            p.expanded ? "size-16 bg-content/5" : "size-11",
          )}
          aria-label={p.playing ? "暂停" : "播放"}
          disabled={!p.data.queue.length || p.busy}
          onClick$={p.toggle$}
        >
          <Icon
            name={p.playing ? "pause" : "play"}
            size={p.expanded ? 32 : 24}
          />
        </Button>
        <Button
          variant="ghost"
          class="size-11 p-0"
          aria-label="下一首"
          disabled={!p.data.queue.length}
          onClick$={p.next$}
        >
          <Icon name="next" size={22} />
        </Button>
      </div>
      <div
        class={cn(
          "flex items-center gap-2 text-[10px] tabular-nums text-muted",
          p.expanded && "order-first",
        )}
      >
        <span>{formatTime(p.data.progress)}</span>
        <Slider
          aria-label="播放进度"
          min={0}
          max={p.data.queue[p.data.index]?.duration || 1}
          step={1}
          value={p.data.progress}
          disabled={!p.source}
          onInput$={(_, el) => p.seek$(Number(el.value))}
          onChange$={p.persist$}
        />
        <span>{formatTime(p.data.queue[p.data.index]?.duration || 0)}</span>
      </div>
    </div>
    <div
      class={cn(
        "flex gap-3",
        p.expanded ? "flex-col" : "w-28 flex-col @min-[1100px]/music:w-40",
      )}
    >
      <div class="flex items-center gap-2 text-xs text-muted">
        <span class="shrink-0 whitespace-nowrap">音量</span>
        <Slider
          aria-label="音量"
          min={0}
          max={1}
          step={0.05}
          value={p.data.volume}
          onInput$={(_, el) => p.volume$(Number(el.value))}
          onChange$={p.persist$}
        />
      </div>
      <Select
        aria-label="播放模式"
        value={p.data.mode}
        options={[
          { value: "sequence", label: "顺序播放" },
          { value: "repeat", label: "单曲循环" },
          { value: "shuffle", label: "随机播放" },
        ]}
        onChange$={(value) => p.mode$(value as PlayMode)}
      />
    </div>
  </div>
));
