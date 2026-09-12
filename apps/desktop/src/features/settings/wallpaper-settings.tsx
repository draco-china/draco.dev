import { component$, type QRL } from "@qwik.dev/core";
import { Button } from "@workspace/ui";
import type { Settings } from "../site/model";
import { WallpaperPreview } from "./wallpaper-preview";

export const WallpaperSettings = component$<{
  settings: Settings;
  onChange$: QRL<(patch: Partial<Settings>) => void>;
}>(({ settings, onChange$ }) => (
  <section class="space-y-4">
    <div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {[
        { id: "alpine", name: "静谧山湖" },
        { id: "aurora", name: "极光" },
        { id: "dusk", name: "落日" },
        { id: "midnight", name: "午夜" },
        ...settings.wallpapers,
      ].map((w) => (
        <Button
          variant="ghost"
          class="group block min-h-0 p-1 text-xs"
          aria-pressed={settings.wallpaper === w.id}
          key={w.id}
          onClick$={() => onChange$({ wallpaper: w.id })}
        >
          <WallpaperPreview wallpaper={w} />
          <span>{w.name}</span>
        </Button>
      ))}
    </div>
  </section>
));
