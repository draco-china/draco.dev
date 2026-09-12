import {
  $,
  component$,
  type QRL,
  useSignal,
  useVisibleTask$,
} from "@qwik.dev/core";
import { Button } from "@workspace/ui";
import { Icon } from "@workspace/ui/icon";
import type { SiteData } from "../site/model";

export interface WelcomeScreenProps {
  profile: SiteData["profile"];
  date: string;
  clock: string;
  desktop: boolean;
  reducedMotion: boolean;
  onEnter$: QRL<() => void | Promise<void>>;
}

export const WelcomeScreen = component$<WelcomeScreenProps>((props) => {
  const surface = useSignal<HTMLElement>();
  const leaving = useSignal(false);
  useVisibleTask$(({ cleanup }) => {
    const element = surface.value;
    if (!element) return;
    const reduced = props.reducedMotion;
    for (const [index, child] of [
      ...element.querySelectorAll<HTMLElement>("[data-welcome-part]"),
    ].entries()) {
      child.animate?.(
        [
          { opacity: 0, transform: reduced ? "none" : "translateY(12px)" },
          { opacity: 1, transform: "none" },
        ],
        {
          duration: reduced ? 80 : 420,
          delay: reduced ? 0 : index * 80,
          easing: "cubic-bezier(.2,.8,.2,1)",
          fill: "backwards",
        },
      );
    }
    cleanup(() => {
      for (const animation of element.getAnimations({ subtree: true }))
        animation.cancel();
    });
  });
  const enter = $(async () => {
    const element = surface.value;
    if (leaving.value || !element) return;
    leaving.value = true;
    for (const animation of element.getAnimations({ subtree: true }))
      animation.cancel();
    const animation = element.animate?.(
      [
        { opacity: 1, transform: "none" },
        {
          opacity: 0,
          transform: props.reducedMotion
            ? "none"
            : "translateY(-20px) scale(1.015)",
        },
      ],
      {
        duration: props.reducedMotion ? 80 : 320,
        easing: "cubic-bezier(.4,0,.2,1)",
        fill: "forwards",
      },
    );
    try {
      await animation?.finished;
    } catch {
      // An interrupted visual transition must not block desktop navigation.
    }
    if (element.isConnected) await props.onEnter$();
  });
  return (
    <main
      ref={surface}
      data-welcome
      data-mode={props.desktop ? "desktop" : "touch"}
      aria-label="欢迎"
      class="relative flex h-dvh flex-col items-center overflow-clip px-[max(24px,env(safe-area-inset-left),env(safe-area-inset-right))] pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))] text-white short-screen:grid short-screen:grid-cols-2 short-screen:gap-6 short-screen:pt-3 short-screen:pb-3"
    >
      <div data-welcome-part class="text-center pt-[3vh] short-screen:pt-0">
        <p class="text-[clamp(14px,2vw,20px)]">{props.date}</p>
        <h1 class="m-0 text-[clamp(84px,22vw,130px)] leading-[1.1] tracking-[-4px] font-extralight tabular-nums short-screen:text-[clamp(42px,9vw,80px)]">
          {props.clock}
        </h1>
      </div>
      <div
        data-welcome-part
        class="my-auto flex min-w-0 flex-col items-center short-screen:my-0"
      >
        <div class="flex size-24 items-center justify-center overflow-hidden rounded-full bg-linear-to-b from-(--avatar-start) to-(--avatar-end) text-5xl font-semibold text-(--avatar-content) shadow-control short-screen:size-14 short-screen:text-3xl">
          {props.profile.avatar ? (
            <img
              width={96}
              height={96}
              src={props.profile.avatar}
              alt=""
              class="size-full"
            />
          ) : (
            props.profile.name.slice(0, 1)
          )}
        </div>
        <h2 class="mt-4 mb-5 text-[23px] font-medium short-screen:mt-2 short-screen:mb-3 short-screen:text-xl">
          {props.profile.name}
        </h2>
        <div class="flex flex-col items-center gap-2">
          <Button
            variant="ghost"
            disabled={leaving.value}
            aria-label="进入桌面"
            class="size-11 min-h-0 rounded-full border-0 bg-white/20 p-0 text-white shadow-glass backdrop-blur-xl hover:bg-white/30 focus-visible:outline-white"
            onClick$={enter}
          >
            <Icon name="arrow" size={22} />
          </Button>
          <span aria-hidden="true" class="text-xs text-white/80">
            进入桌面
          </span>
        </div>
      </div>
    </main>
  );
});
