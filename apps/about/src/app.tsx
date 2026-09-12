import { component$ } from "@qwik.dev/core";
import type { AppContentProps } from "@workspace/app-sdk";
import { AppPage } from "@workspace/ui";
import { ProfileFocus } from "./components/profile-focus";
import { ProfileHero } from "./components/profile-hero";
import { ProfileStack } from "./components/profile-stack";
import { ProfileTimeline } from "./components/profile-timeline";

export default component$<AppContentProps>(() => (
  <AppPage class="max-w-5xl gap-8 py-8 sm:gap-9 sm:px-5 sm:py-10">
    <ProfileHero />
    <ProfileFocus />
    <ProfileStack />
    <ProfileTimeline />
  </AppPage>
));
