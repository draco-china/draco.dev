import { component$, type QRL, type Signal } from "@qwik.dev/core";
import { Input, Select } from "@workspace/ui";
import { Icon } from "@workspace/ui/icon";
import { type Settings, searchUrl } from "../site/model";
import { FeaturedShortcuts } from "./featured-shortcuts";
import type { AppId, DesktopState } from "./state";
import { ClockWidget } from "./widgets/clock-widget";
import { MusicWidget } from "./widgets/music-widget";
export const DesktopHome = component$<{
  s: DesktopState;
  query: Signal<string>;
  searchInput: Signal<HTMLInputElement | undefined>;
  open: QRL<(id: AppId, stamp?: number) => Promise<void>>;
  changeSettings: QRL<(patch: Partial<Settings>) => Promise<void>>;
}>(({ s, query, searchInput, open, changeSettings }) => {
  return (
    <main
      class="absolute inset-x-0 top-9 mx-auto h-[calc(100dvh-36px)] max-w-none overflow-clip px-6 pt-[max(24px,env(safe-area-inset-top))] pb-[100px] animate-rise touch:top-0 touch:h-dvh"
      data-home-touch={!s.desktop}
      data-desktop-home
      inert={
        !!s.active &&
        (!s.desktop ||
          s.windows.some(
            (w) => w.id === s.active && w.maximized && !w.minimized,
          ))
      }
      aria-label="个人桌面"
    >
      <section
        data-home-center
        class="w-full min-w-0 pt-[18px] max-tablet:col-span-full max-tablet:row-start-1 max-tablet:pt-0 max-phone:order-0"
      >
        <ClockWidget date={s.date} clock={s.clock} compact={!s.desktop} />
        <form
          data-home-search
          class="mx-auto mt-8 flex max-w-[580px] items-center gap-3 rounded-[18px] bg-glass/50 focus-within:ring-2 focus-within:ring-white/50 px-[15px] py-3 text-content shadow-glass backdrop-blur-xl backdrop-saturate-150 max-tablet:max-w-[570px] max-tablet:mt-6 max-phone:mt-[22px] max-phone:gap-2 max-phone:rounded-panel max-phone:p-3"
          preventdefault:submit
          onSubmit$={() => {
            if (query.value.trim())
              window.open(
                searchUrl(s.settings.engine, query.value.trim()),
                "_blank",
                "noopener,noreferrer",
              );
          }}
        >
          <Icon name="search" size={22} />
          <Input
            class="w-full rounded-none border-0 bg-transparent! focus-visible:outline-none! p-0 text-sm text-content placeholder:text-muted max-phone:text-(length:--text-control)"
            ref={searchInput}
            aria-label="搜索关键词"
            enterKeyHint="search"
            placeholder="搜索，探索更大的世界"
            bind:value={query}
          />
          <Select
            align="end"
            class="w-[76px] min-w-[65px] rounded-none border-0 bg-transparent! focus-visible:outline-none! p-0 text-[11px] text-muted max-phone:w-[63px] max-phone:min-w-[63px] max-phone:text-[10px]"
            aria-label="搜索引擎"
            value={s.settings.engine}
            onChange$={(value) =>
              changeSettings({ engine: value as Settings["engine"] })
            }
            options={[
              { value: "google", label: "Google" },
              { value: "bing", label: "Bing" },
              { value: "baidu", label: "百度" },
            ]}
          />
        </form>
        <FeaturedShortcuts desktop={s.desktop} />
        <section
          data-home-widgets
          style={{ touchAction: "pan-y" }}
          aria-label="桌面小组件内容"
          class="mx-auto mt-7 grid w-full max-w-[360px] min-h-0 grid-cols-1 gap-3"
        >
          <div data-widget-page="music" class="min-h-0">
            <MusicWidget open={open} />
          </div>
        </section>
      </section>
    </main>
  );
});
