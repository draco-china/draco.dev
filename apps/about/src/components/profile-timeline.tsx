import { component$ } from "@qwik.dev/core";
import { profile } from "../profile";

export const ProfileTimeline = component$(() => (
  <section class="sm:px-8">
    <h2 class="mb-6 text-xl font-semibold tracking-tight">走过的路</h2>
    <ol>
      {profile.experience.map((item, index) => (
        <li
          key={item.period}
          class="relative grid grid-cols-[16px_1fr] gap-x-3 pb-7 last:pb-0 sm:grid-cols-[160px_16px_1fr] sm:gap-x-4"
        >
          <p class="col-start-2 mb-2 text-xs tabular-nums text-muted sm:col-start-1 sm:row-start-1 sm:mt-1 sm:mb-0">
            {item.period}
          </p>
          <div
            aria-hidden="true"
            class="absolute top-1 bottom-0 left-[7px] w-px bg-accent/20 sm:left-[183px]"
          >
            <span class="absolute -left-1 top-0 size-2.5 rounded-full bg-accent ring-4 ring-accent/10" />
            {index === profile.experience.length - 1 && (
              <span class="absolute top-3 bottom-0 w-full bg-linear-to-b from-transparent to-glass" />
            )}
          </div>
          <div class="col-start-2 sm:col-start-3 sm:row-start-1">
            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h3 class="text-base font-semibold">{item.title}</h3>
              {item.company && (
                <p class="text-sm leading-6 text-muted">
                  <span aria-hidden="true" class="mr-2">
                    /
                  </span>
                  {item.company}
                </p>
              )}
            </div>
            <p class="mt-2 text-sm leading-6 text-muted">{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  </section>
));
