import { component$, useSignal, useVisibleTask$ } from "@qwik.dev/core";
import { featuredSites } from "@workspace/navigation/featured";
import {
  fallbackLibrary,
  loadNavigationLibrary,
} from "@workspace/navigation/library";

export const FeaturedShortcuts = component$<{ desktop: boolean }>(
  ({ desktop }) => {
    const limit = desktop ? 18 : 12;
    const columns = useSignal(6);
    const element = useSignal<HTMLElement>();
    useVisibleTask$(({ cleanup }) => {
      const canvas = element.value?.closest("[data-desktop-home]");
      if (!canvas) return;
      const observer = new ResizeObserver(() => {
        columns.value = canvas.clientWidth < 640 ? 4 : 6;
      });
      observer.observe(canvas);
      cleanup(() => observer.disconnect());
    });
    const sites = useSignal(featuredSites(fallbackLibrary().sites));
    useVisibleTask$(async () => {
      try {
        sites.value = featuredSites(
          (await loadNavigationLibrary("featured")).sites,
        );
      } catch {
        // Keep the curated built-in directory available offline.
      }
    });
    const visible =
      limit === 18
        ? sites.value
        : ["设计", "前端", "产品", "运营"].flatMap((group) =>
            sites.value
              .filter((site) => site.group === group)
              .slice(0, limit / 4),
          );
    return (
      <nav
        ref={element}
        data-compact={limit < 18}
        aria-label="常用网站"
        data-home-shortcuts
        class="mx-auto mt-6 flex w-full max-w-[580px] items-center gap-1"
      >
        <div
          class="grid min-w-0 flex-1 justify-items-center gap-x-3 gap-y-5"
          style={{
            gridTemplateColumns: `repeat(${columns.value}, minmax(0, 1fr))`,
          }}
        >
          {visible.map((site) => (
            <a
              key={site.id}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              title={site.name}
              class="group flex w-full min-w-0 flex-col items-center gap-2 rounded-control text-(--desktop-content) focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span class="grid size-12 place-items-center text-sm font-semibold transition-transform group-hover:scale-105 group-active:scale-95">
                {site.iconDataUrl || site.iconUrl ? (
                  <img
                    src={site.iconDataUrl || site.iconUrl}
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    width={48}
                    height={48}
                    alt=""
                    class="size-full rounded-control object-contain"
                  />
                ) : (
                  site.icon || site.name.charAt(0)
                )}
              </span>
              <span class="block w-full truncate text-center text-[11px] leading-tight text-shadow-(--desktop-label-shadow)">
                {site.name}
              </span>
            </a>
          ))}
        </div>
      </nav>
    );
  },
);
