import {
  component$,
  useSignal,
  useStore,
  useTask$,
  useVisibleTask$,
} from "@qwik.dev/core";
import type { AppContentProps } from "@workspace/app-sdk";
import { Button, Input, SegmentedControl, Select } from "@workspace/ui";
import { Icon } from "@workspace/ui/icon";
import {
  fallbackLibrary,
  librarySites,
  loadNavigationLibrary,
  type NavigationLibrary,
} from "./library";
import { NavigationSidebar } from "./navigation-sidebar";
import { NavigationSite } from "./navigation-site";

export default component$<
  AppContentProps & { initialLibrary?: NavigationLibrary }
>(({ initialLibrary }) => {
  const scroll = useSignal<HTMLDivElement>();
  const s = useStore({
    library: initialLibrary ?? fallbackLibrary(),
    libraryError: false,
    query: "",
    category: "",
    group: "",
    section: "websites" as "websites" | "downloads",
  });
  useTask$(({ track }) => {
    const library = track(() => initialLibrary);
    if (library) s.library = library;
  });
  useVisibleTask$(async () => {
    if (initialLibrary?.updatedAt) return;
    try {
      s.library = await loadNavigationLibrary();
    } catch {
      s.libraryError = true;
    }
  });
  useVisibleTask$(({ track }) => {
    track(() => s.group);
    track(() => s.category);
    track(() => s.section);
    track(() => s.query);
    if (scroll.value) scroll.value.scrollTop = 0;
  });
  const sites = librarySites(s.library, s.query, s.category, s.section).filter(
    (site) => !s.group || site.group === s.group,
  );
  const groups = [
    ...new Set(
      s.library.sites
        .filter((site) => (site.section || "websites") === s.section)
        .map((site) => site.group)
        .filter((group): group is string => !!group),
    ),
  ];
  const categories = [
    ...new Set(
      s.library.sites
        .filter(
          (site) =>
            (site.section || "websites") === s.section &&
            (!s.group || site.group === s.group),
        )
        .map((site) => site.category),
    ),
  ];
  const sections = [...new Set(sites.map((site) => site.category))];
  return (
    <div
      class="@container h-full min-h-0 w-full bg-glass [[data-window]_&]:bg-transparent text-content"
      data-navigation
    >
      <div class="flex h-full min-h-0">
        <NavigationSidebar
          groups={groups}
          selected={s.group}
          onChange$={(value) => {
            s.group = value;
            s.category = "";
          }}
        />
        <main class="flex min-h-0 min-w-0 flex-1 flex-col">
          <header class="shrink-0 space-y-4 px-4 pb-5 pt-3 @min-[760px]:px-7">
            <div class="flex items-center justify-between gap-3">
              <div class="flex min-w-0 items-baseline gap-3">
                <h1 class="text-xl font-semibold tracking-tight">
                  {s.group || (s.section === "downloads" ? "下载" : "探索网站")}
                </h1>
                <span
                  class="shrink-0 text-xs tabular-nums text-muted"
                  role="status"
                >
                  {sites.length} 个站点
                </span>
              </div>
              <SegmentedControl
                label="导航类型"
                value={s.section}
                options={[
                  { value: "websites", label: "网站" },
                  { value: "downloads", label: "下载" },
                ]}
                onChange$={(value) => {
                  s.section = value as "websites" | "downloads";
                  s.category = "";
                  s.group = "";
                }}
              />
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <div class="relative min-w-32 flex-1">
                <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
                  <Icon name="search" size={16} />
                </span>
                <Input
                  class="w-full bg-content/5 pl-9"
                  aria-label="搜索网站"
                  placeholder="搜索网站"
                  value={s.query}
                  onInput$={(_, el) => {
                    s.query = el.value;
                  }}
                />
              </div>
              <div class="min-w-0 @min-[760px]:hidden">
                <Select
                  aria-label="导航大类"
                  value={s.group}
                  options={[
                    { value: "", label: "所有类别" },
                    ...groups.map((group) => ({ value: group, label: group })),
                  ]}
                  onChange$={(value) => {
                    s.group = value;
                    s.category = "";
                  }}
                />
              </div>
              <div>
                <Select
                  aria-label="网站分类"
                  value={s.category}
                  options={[
                    { value: "", label: "全部分类" },
                    ...categories.filter(Boolean).map((category) => ({
                      value: category,
                      label: category,
                    })),
                  ]}
                  onChange$={(value) => {
                    s.category = value;
                  }}
                />
              </div>
              {s.libraryError && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick$={async () => {
                    try {
                      s.library = await loadNavigationLibrary();
                      s.libraryError = false;
                    } catch {
                      s.libraryError = true;
                    }
                  }}
                >
                  刷新目录
                </Button>
              )}
            </div>
          </header>
          <div
            ref={scroll}
            class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 @min-[760px]:px-7"
            data-navigation-scroll
          >
            {sections.map((category) => (
              <section
                key={`category:${category}`}
                class="border-t border-divider/40 py-5 first:border-t-0 first:pt-1"
              >
                <h2 class="mb-3 text-sm font-semibold @min-[760px]:text-base">
                  {category || "网站"}
                </h2>
                <div class="grid grid-cols-2 gap-2 @min-[760px]:grid-cols-3 @min-[760px]:gap-x-4 @min-[760px]:gap-y-2">
                  {sites
                    .filter((site) => site.category === category)
                    .map((site) => (
                      <NavigationSite key={site.id} site={site} />
                    ))}
                </div>
              </section>
            ))}
            {sites.length === 0 && (
              <p class="py-10 text-center text-sm text-muted">
                没有找到匹配的网站
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
});
