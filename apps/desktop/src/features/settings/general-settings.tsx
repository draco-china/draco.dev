import { component$, type QRL } from "@qwik.dev/core";
import { Field, Select } from "@workspace/ui";
import type { Settings } from "../site/model";

export const GeneralSettings = component$<{
  settings: Settings;
  onChange$: QRL<(patch: Partial<Settings>) => void>;
}>(({ settings, onChange$ }) => (
  <section class="space-y-4">
    <h2 class="text-sm font-semibold">搜索</h2>
    <Field
      layout="row"
      class="flex flex-wrap items-center justify-between gap-3 border-t border-divider/50 py-4 text-sm"
    >
      <span>默认搜索引擎</span>
      <Select
        aria-label="默认搜索引擎"
        value={settings.engine}
        onChange$={(value) =>
          onChange$({ engine: value as Settings["engine"] })
        }
        options={[
          { value: "google", label: "Google" },
          { value: "bing", label: "Bing" },
          { value: "baidu", label: "百度" },
        ]}
      />
    </Field>
  </section>
));
