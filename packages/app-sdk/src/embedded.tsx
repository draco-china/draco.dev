import { $, component$, useSignal, useVisibleTask$ } from "@qwik.dev/core";
import { type AppHost, createAppMessage, readAppMessage } from "./index";
export const EmbeddedApp = component$<{
  host: AppHost;
  appId: string;
  url: string;
  bridge?: boolean;
  sandbox?: string;
  allow?: string;
}>((props) => {
  const frame = useSignal<HTMLIFrameElement>();
  const source = useSignal<string>();
  const ready = useSignal(false);
  const attempt = useSignal(0);
  const delayed = useSignal(false);
  const sync = $(() => {
    const target = frame.value?.contentWindow;
    if (!target || !ready.value) return;
    const origin = new URL(props.url).origin;
    for (const payload of [
      { type: "appearance", value: { ...props.host.appearance } } as const,
      { type: "visibility", visible: props.host.visible } as const,
      { type: "path", path: props.host.path } as const,
    ])
      target.postMessage(createAppMessage(props.appId, payload), origin);
  });
  useVisibleTask$(({ track, cleanup }) => {
    const url = new URL(track(() => props.url));
    track(() => attempt.value);
    ready.value = false;
    delayed.value = false;
    if (props.bridge) {
      url.searchParams.set("hostOrigin", location.origin);
      url.searchParams.set("appId", props.appId);
    }
    source.value = url.href;
    const timer = setTimeout(() => {
      delayed.value = true;
    }, 10000);
    function receive(event: MessageEvent) {
      const child = frame.value?.contentWindow;
      if (!props.bridge || !child) return;
      const message = readAppMessage(event, {
        origin: url.origin,
        source: child,
        appId: props.appId,
      });
      if (!message) return;
      switch (message.type) {
        case "ready":
          ready.value = true;
          delayed.value = false;
          clearTimeout(timer);
          void sync();
          break;
        case "title":
          void props.host.setTitle$(message.title);
          break;
        case "path":
          if (message.path !== props.host.path)
            void props.host.navigate$(message.path);
          break;
        case "open-url":
          void props.host.openUrl$(message.url);
          break;
      }
    }
    window.addEventListener("message", receive);
    cleanup(() => {
      clearTimeout(timer);
      window.removeEventListener("message", receive);
    });
  });
  useVisibleTask$(({ track }) => {
    track(() => props.host.path);
    track(() => props.host.visible);
    track(() => JSON.stringify(props.host.appearance));
    void sync();
  });
  return (
    <div class="flex h-full min-h-0 flex-col">
      <div class="flex shrink-0 justify-end gap-3 px-3 py-2 text-xs text-muted">
        {delayed.value && <span>页面尚未就绪，可重试或独立打开。</span>}
        <button type="button" onClick$={() => attempt.value++}>
          重新加载
        </button>
        <a href={props.url} target="_blank" rel="noopener noreferrer">
          独立打开 ↗
        </a>
      </div>
      <iframe
        key={`${props.url}:${attempt.value}`}
        ref={frame}
        src={source.value}
        title={props.appId}
        sandbox={
          props.sandbox ||
          "allow-scripts allow-same-origin allow-forms allow-popups"
        }
        allow={props.allow}
        class="min-h-0 w-full flex-1 border-0"
      />
    </div>
  );
});
