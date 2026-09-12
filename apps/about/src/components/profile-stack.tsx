import { component$ } from "@qwik.dev/core";
import { profile } from "../profile";

export const ProfileStack = component$(() => (
  <section class="rounded-widget bg-surface/65 p-5 shadow-card sm:p-8">
    <h2 class="mb-4 text-xl font-semibold tracking-tight">技术栈</h2>
    <dl class="divide-y divide-divider">
      {profile.stack.map((group) => (
        <div
          key={group.title}
          class="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:gap-5"
        >
          <dt class="shrink-0 text-sm font-medium text-muted sm:w-32 sm:pt-0.5">
            {group.title}
          </dt>
          <dd class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {group.items.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  </section>
));
