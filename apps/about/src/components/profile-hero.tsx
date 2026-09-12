import { component$ } from "@qwik.dev/core";
import { profile } from "../profile";

export const ProfileHero = component$(() => (
  <header class="flex flex-col gap-7 sm:px-8">
    <div class="flex items-center gap-5 sm:gap-7">
      <div class="grid size-24 shrink-0 place-items-center overflow-hidden rounded-widget bg-linear-to-br from-accent/65 to-accent text-5xl font-semibold text-on-accent shadow-card sm:size-32 sm:text-7xl">
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt=""
            width={96}
            height={96}
            class="size-full object-cover"
          />
        ) : (
          profile.name.charAt(0)
        )}
      </div>
      <div class="min-w-0">
        <h1 class="text-4xl font-semibold tracking-tight sm:text-[56px]">
          {profile.name}
        </h1>
        <p class="mt-2 text-xl font-semibold">全栈开发者</p>
        <p class="mt-2 text-xs text-muted sm:text-sm">
          Web · 云原生 · 开发工具
        </p>
      </div>
    </div>
    <p class="text-sm leading-7 text-content sm:text-lg sm:leading-8">
      {profile.bio}
    </p>
  </header>
));
