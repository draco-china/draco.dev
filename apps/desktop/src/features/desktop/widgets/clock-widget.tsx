import { component$ } from "@qwik.dev/core";
import { Widget } from "@workspace/ui";
export const ClockWidget = component$<{
  date: string;
  clock: string;
  compact: boolean;
}>(({ date, clock, compact }) =>
  compact ? (
    <Widget
      data-home-clock
      aria-label="日期与时间"
      class="justify-center gap-1 rounded-panel bg-glass/70 px-3 py-2.5 text-center"
    >
      <p class="text-xs text-muted">{date}</p>
      <div class="font-light tabular-nums tracking-tight">{clock}</div>
    </Widget>
  ) : (
    <section
      data-home-clock
      aria-label="日期与时间"
      class="text-center text-(--desktop-content) [text-shadow:0_3px_20px_var(--clock-shadow)] [&>p]:mb-1 [&>p]:text-[15px] [&>div]:font-extralight [&>div]:tracking-[-5px] [&>div]:tabular-nums"
    >
      <p>{date}</p>
      <div>{clock}</div>
    </section>
  ),
);
