import { component$, type QRL, useSignal } from "@qwik.dev/core";
import { Button, Select } from "@workspace/ui";
import { Icon } from "@workspace/ui/icon";
import { cn } from "cn";
import type { Settings } from "../site/model";
import { AppearanceSettings } from "./appearance-settings";
import { GeneralSettings } from "./general-settings";
import { WallpaperSettings } from "./wallpaper-settings";

const sections = [
  {
    value: "appearance",
    label: "外观",
    icon: "sun",
    description: "选择喜欢的显示方式与颜色",
  },
  {
    value: "wallpaper",
    label: "壁纸",
    icon: "home",
    description: "为桌面换一幅风景",
  },
  {
    value: "general",
    label: "通用",
    icon: "settings",
    description: "调整搜索与使用偏好",
  },
];
export const SettingsApp = component$<{
  settings: Settings;
  onChange$: QRL<(patch: Partial<Settings>) => void>;
  onReset$: QRL<() => void>;
}>(({ settings, onChange$, onReset$ }) => {
  const selected = useSignal("appearance");
  const current =
    sections.find((item) => item.value === selected.value) || sections[0];
  return (
    <div
      class="@container/settings flex h-full min-h-0 bg-glass [[data-window]_&]:bg-transparent text-content"
      data-settings-app
    >
      <nav
        aria-label="设置分类"
        class="hidden w-[180px] shrink-0 flex-col gap-1 bg-content/3 p-3 @min-[680px]/settings:flex"
      >
        <p class="px-3 pb-4 pt-2 text-xs text-muted">当前浏览器</p>
        {sections.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={selected.value === item.value}
            onClick$={() => {
              selected.value = item.value;
            }}
            class={cn(
              "flex min-h-11 items-center gap-3 rounded-control px-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent",
              selected.value === item.value
                ? "bg-accent/15 font-medium text-accent"
                : "hover:bg-content/5",
            )}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </button>
        ))}
      </nav>
      <main class="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 @min-[680px]/settings:px-7">
        <div class="mb-5 @min-[680px]/settings:hidden">
          <Select
            aria-label="设置分类"
            value={selected.value}
            options={sections}
            onChange$={(value) => {
              selected.value = value;
            }}
          />
        </div>
        <header class="mb-6">
          <h1 class="text-xl font-semibold tracking-tight">{current.label}</h1>
          <p class="mt-1 text-sm text-muted">{current.description}</p>
        </header>
        <div hidden={selected.value !== "appearance"}>
          <AppearanceSettings settings={settings} onChange$={onChange$} />
        </div>
        <div hidden={selected.value !== "wallpaper"}>
          <WallpaperSettings settings={settings} onChange$={onChange$} />
        </div>
        <div hidden={selected.value !== "general"}>
          <GeneralSettings settings={settings} onChange$={onChange$} />
          <div class="mt-6 border-t border-divider/50 pt-5">
            <p class="mb-3 text-sm text-muted">
              外观和搜索偏好自动保存在当前浏览器
            </p>
            <Button variant="secondary" onClick$={onReset$}>
              恢复站点默认设置
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
});
