import { component$ } from "@qwik.dev/core";
import { profile } from "../profile";

export const ProfileFocus = component$(() => (
  <section
    aria-label="关注方向"
    class="grid gap-5 sm:grid-cols-3 sm:gap-6 sm:px-8"
  >
    {profile.highlights.map((item) => (
      <div
        key={item.title}
        class="sm:border-l sm:border-divider sm:pl-5 sm:first:border-0 sm:first:pl-0"
      >
        <h2 class="text-base font-semibold">{item.title}</h2>
        <p class="mt-2 text-sm leading-6 text-muted">{item.description}</p>
      </div>
    ))}
  </section>
));
