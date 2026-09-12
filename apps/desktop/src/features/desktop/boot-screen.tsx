import { component$ } from "@qwik.dev/core";

export const BootScreen = component$<{ progress: number; avatar?: string }>(
  ({ progress, avatar }) => (
    <main
      data-boot-screen
      aria-busy="true"
      class="fixed inset-0 z-1400 grid place-items-center bg-(--boot-surface) text-content"
    >
      <div class="flex flex-col items-center gap-10">
        <div class="animate-rise text-[80px] font-semibold tracking-[-4px] [animation-duration:var(--duration-micro)]">
          {avatar ? (
            <img
              src={avatar}
              alt="个人标识"
              width={80}
              height={80}
              class="size-20 rounded-widget object-cover"
            />
          ) : (
            <span role="img" aria-label="个人标识">
              D
            </span>
          )}
        </div>
        <progress
          value={progress}
          max={100}
          aria-label="正在准备桌面"
          class="h-1 w-36 appearance-none overflow-hidden rounded-full bg-content/15 [&::-webkit-progress-bar]:bg-content/15 [&::-webkit-progress-value]:bg-content [&::-moz-progress-bar]:bg-content [&::-webkit-progress-value]:transition-[width] [&::-webkit-progress-value]:duration-micro"
        />
      </div>
    </main>
  ),
);
