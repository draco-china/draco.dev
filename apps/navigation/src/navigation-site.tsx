import { component$ } from "@qwik.dev/core";
import type { Site } from "./model";

export const NavigationSite = component$<{ site: Site }>(({ site }) => (
  <a
    href={site.url}
    target="_blank"
    rel="noopener noreferrer"
    class="group flex min-w-0 items-center gap-2.5 rounded-control bg-content/4 p-2.5 transition-colors hover:bg-content/8 focus-visible:outline-2 focus-visible:outline-accent @min-[760px]:gap-3 @min-[760px]:bg-transparent @min-[760px]:p-3"
  >
    <span class="grid size-10 shrink-0 place-items-center font-semibold text-accent @min-[760px]:size-12">
      {site.iconUrl ? (
        <img
          src={site.iconUrl}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          class="size-full rounded-control object-contain"
        />
      ) : (
        site.icon || site.name.charAt(0)
      )}
    </span>
    <span class="min-w-0">
      <span class="block truncate text-sm font-medium text-content">
        {site.name}
      </span>
      <span class="mt-1 block truncate text-xs leading-relaxed text-muted">
        {site.description || site.category}
      </span>
    </span>
  </a>
));
