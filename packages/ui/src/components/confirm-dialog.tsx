import {
  component$,
  type QRL,
  useId,
  useSignal,
  useVisibleTask$,
} from "@qwik.dev/core";
import { Button } from "./button";

export const ConfirmDialog = component$<{
  open: boolean;
  message: string;
  onConfirm$: QRL<() => void | Promise<void>>;
  onCancel$: QRL<() => void | Promise<void>>;
}>((props) => {
  const dialog = useSignal<HTMLDialogElement>();
  const busy = useSignal(false);
  const error = useSignal("");
  const id = useId();
  useVisibleTask$(
    ({ track, cleanup }) => {
      const open = track(() => props.open);
      const element = track(() => dialog.value);
      if (!element || !open) return;
      const previous =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : undefined;
      error.value = "";
      // biome-ignore lint/correctness/useQwikValidLexicalScope: native non-bubbling listener is created and removed inside the browser effect
      const cancel = (event: Event) => {
        event.preventDefault();
        if (!busy.value) void props.onCancel$();
      };
      // biome-ignore lint/correctness/useQwikValidLexicalScope: native listener is scoped to this browser effect
      const keydown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (!busy.value) void props.onCancel$();
        }
      };
      element.addEventListener("keydown", keydown);
      element.addEventListener("cancel", cancel);
      element.showModal();
      cleanup(() => {
        element.removeEventListener("keydown", keydown);
        element.removeEventListener("cancel", cancel);
        element.close();
        if (previous?.isConnected) previous.focus();
      });
    },
    { strategy: "document-ready" },
  );
  return (
    <dialog
      ref={dialog}
      aria-labelledby={id}
      class="m-auto w-[calc(100%-2rem)] max-w-sm rounded-widget border-0 bg-surface p-6 text-content shadow-glass backdrop:bg-black/35 backdrop:backdrop-blur-sm"
    >
      <h2 id={id} class="text-base font-semibold">
        确认操作
      </h2>
      <p class="mt-3 text-sm text-muted">{props.message}</p>
      {error.value && (
        <p role="alert" class="mt-3 text-sm text-danger">
          {error.value}
        </p>
      )}
      <div class="mt-6 flex justify-end gap-3">
        <Button
          autoFocus
          variant="secondary"
          disabled={busy.value}
          onClick$={props.onCancel$}
        >
          取消
        </Button>
        <Button
          variant="danger"
          loading={busy.value}
          onClick$={async () => {
            busy.value = true;
            try {
              await props.onConfirm$();
            } catch {
              error.value = "操作失败，请重试";
            } finally {
              busy.value = false;
            }
          }}
        >
          确认
        </Button>
      </div>
    </dialog>
  );
});
