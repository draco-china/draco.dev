import { component$, type QRL } from "@qwik.dev/core";
import { Button, Field, Select } from "@workspace/ui";
import type { Settings } from "../site/model";
import { AppearancePreview } from "./appearance-preview";

const accents = {
  blue: "var(--palette-blue)",
  purple: "var(--palette-purple)",
  pink: "var(--palette-pink)",
  red: "var(--palette-red)",
  orange: "var(--palette-orange)",
  yellow: "var(--palette-yellow)",
  green: "var(--palette-green)",
  graphite: "var(--palette-graphite)",
};
const labels = {
  blue: "蓝",
  purple: "紫",
  pink: "粉",
  red: "红",
  orange: "橙",
  yellow: "黄",
  green: "绿",
  graphite: "石墨",
};

export const AppearanceSettings = component$<{
  settings: Settings;
  onChange$: QRL<(patch: Partial<Settings>) => void>;
}>(({ settings, onChange$ }) => (
  <section class="space-y-4">
    <div class="mb-5 grid grid-cols-3 gap-3">
      {(["light", "dark", "system"] as const).map((theme) => (
        <Button
          variant="ghost"
          key={theme}
          class="group block min-h-0 p-1 text-xs"
          aria-pressed={settings.theme === theme}
          onClick$={() => onChange$({ theme })}
        >
          <AppearancePreview mode={theme} />
          <span>
            {theme === "light"
              ? "浅色"
              : theme === "dark"
                ? "深色"
                : "跟随系统"}
          </span>
        </Button>
      ))}
    </div>
    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-divider/50 py-4 text-sm">
      <div>
        <strong>强调色</strong>
        <small class="mt-1 block text-xs text-muted">按钮和选中项的颜色</small>
      </div>
      <div class="accent-options flex flex-wrap gap-2">
        {Object.entries(accents).map(([key, value]) => (
          <Button
            variant="ghost"
            key={key}
            aria-label={labels[key as keyof typeof labels]}
            aria-pressed={settings.accent === key}
            class="size-8 min-h-0 rounded-full p-0 text-sm text-white aria-pressed:outline-2 aria-pressed:outline-offset-3 aria-pressed:outline-accent"
            style={{ background: value }}
            onClick$={() => onChange$({ accent: key as Settings["accent"] })}
          >
            {settings.accent === key ? "✓" : ""}
          </Button>
        ))}
      </div>
    </div>
    <Field
      layout="row"
      class="flex flex-wrap items-center justify-between gap-3 border-t border-divider/50 py-4 text-sm"
    >
      <span>图标外观</span>
      <Select
        aria-label="图标外观"
        value={settings.icons}
        onChange$={(value) => onChange$({ icons: value as Settings["icons"] })}
        options={[
          { value: "original", label: "原彩" },
          { value: "tinted", label: "跟随强调色" },
        ]}
      />
    </Field>
    <Field
      layout="row"
      class="flex flex-wrap items-center justify-between gap-3 border-t border-divider/50 py-4 text-sm"
    >
      <span>动态效果</span>
      <Select
        aria-label="动态效果"
        value={settings.motion}
        onChange$={(value) =>
          onChange$({ motion: value as Settings["motion"] })
        }
        options={[
          { value: "system", label: "跟随系统" },
          { value: "full", label: "完整" },
          { value: "reduced", label: "减弱" },
        ]}
      />
    </Field>
  </section>
));
