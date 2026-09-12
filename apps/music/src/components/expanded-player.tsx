import {
  component$,
  type QRL,
  Slot,
  useSignal,
  useVisibleTask$,
} from "@qwik.dev/core";
import { Button } from "@workspace/ui";
import { Icon } from "@workspace/ui/icon";
export const ExpandedPlayer = component$<{ onClose$: QRL<() => unknown> }>(
  (p) => {
    const dialog = useSignal<HTMLDialogElement>();
    useVisibleTask$(
      ({ cleanup }) => {
        const element = dialog.value;
        const previous = document.activeElement as HTMLElement | null;
        function cancel() {
          void p.onClose$();
        }
        function keydown(event: KeyboardEvent) {
          if (event.key === "Escape") event.stopPropagation();
        }
        element?.addEventListener("cancel", cancel);
        element?.addEventListener("keydown", keydown);
        element?.showModal();
        cleanup(() => {
          element?.removeEventListener("cancel", cancel);
          element?.removeEventListener("keydown", keydown);
          element?.close();
          previous?.focus({ preventScroll: true });
        });
      },
      { strategy: "document-ready" },
    );
    return (
      <dialog
        ref={dialog}
        aria-label="正在播放"
        class="fixed inset-0 m-auto h-dvh max-h-dvh w-full max-w-none overflow-auto overscroll-contain border-0 bg-[oklch(from_var(--surface)_l_c_h)] p-5 text-content backdrop:bg-black/35 backdrop:backdrop-blur-xl @min-[700px]/music:h-[min(780px,90dvh)] @min-[700px]/music:w-[460px] @min-[700px]/music:rounded-widget"
      >
        <header class="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            aria-label="收起播放器"
            class="size-11 p-0"
            onClick$={p.onClose$}
          >
            <span class="rotate-[-90deg]">
              <Icon name="back" />
            </span>
          </Button>
          <h2 class="text-sm font-medium">正在播放</h2>
          <span class="size-11" />
        </header>
        <div class="mx-auto max-w-sm space-y-6 pb-[max(20px,env(safe-area-inset-bottom))]">
          <Slot />
        </div>
      </dialog>
    );
  },
);
