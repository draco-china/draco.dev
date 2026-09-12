import {
  $,
  type Component,
  component$,
  useStore,
  useVisibleTask$,
} from "@qwik.dev/core";
import { applyAppAppearance, readStandaloneAppearance } from "./appearance";
import {
  type AppContentProps,
  type AppHost,
  createAppMessage,
  isAppPath,
  isSafeWebUrl,
  readAppMessage,
} from "./index";

export const StandaloneApp = component$<{
  app: Component<AppContentProps>;
  appId: string;
  title: string;
  allowedParentOrigins?: string[];
}>(
  ({
    app: App,
    appId,
    title,
    allowedParentOrigins = ["https://draco.dev"],
  }) => {
    const bridge = useStore({ origin: "" });
    const state = useStore<AppHost>({
      mode: "standalone",
      appearance: readStandaloneAppearance(),
      visible: true,
      path: "/",
      openUrl$: $((url: string) => {
        if (!isSafeWebUrl(url)) return;
        if (bridge.origin)
          parent.postMessage(
            createAppMessage(appId, { type: "open-url", url }),
            bridge.origin,
          );
        else window.open(url, "_blank", "noopener,noreferrer");
      }),
      navigate$: $((path: string) => {
        if (!isAppPath(path)) return;
        const url = new URL(path, location.origin);
        if (bridge.origin) {
          url.searchParams.set("hostOrigin", bridge.origin);
          url.searchParams.set("appId", appId);
        }
        history.pushState(null, "", url);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }),
      setTitle$: $((next: string) => {
        document.title = next;
        if (bridge.origin)
          parent.postMessage(
            createAppMessage(appId, { type: "title", title: next }),
            bridge.origin,
          );
      }),
    });
    useVisibleTask$(({ cleanup }) => {
      document.title = title;
      const parameters = new URL(location.href).searchParams;
      const requested = parameters.get("hostOrigin");
      if (
        parent !== window &&
        requested &&
        allowedParentOrigins.includes(requested) &&
        parameters.get("appId") === appId
      ) {
        bridge.origin = requested;
        state.mode = "desktop";
      }
      const dark = matchMedia("(prefers-color-scheme: dark)");
      const reduced = matchMedia("(prefers-reduced-motion: reduce)");
      function apply() {
        applyAppAppearance(state.appearance);
      }
      function appearance() {
        if (bridge.origin) return;
        state.appearance = readStandaloneAppearance();
        apply();
      }
      function navigate() {
        const url = new URL(location.href);
        url.searchParams.delete("hostOrigin");
        url.searchParams.delete("appId");
        state.path = url.pathname + url.search + url.hash;
        if (bridge.origin)
          parent.postMessage(
            createAppMessage(appId, { type: "path", path: state.path }),
            bridge.origin,
          );
      }
      function visibility() {
        if (!bridge.origin)
          state.visible = document.visibilityState === "visible";
      }
      function receive(event: MessageEvent) {
        if (!bridge.origin) return;
        const message = readAppMessage(event, {
          origin: bridge.origin,
          source: parent,
          appId,
        });
        if (!message) return;
        if (message.type === "appearance") {
          state.appearance = message.value;
          apply();
        } else if (message.type === "visibility")
          state.visible = message.visible;
        else if (message.type === "path" && state.path !== message.path) {
          state.path = message.path;
          const url = new URL(message.path, location.origin);
          url.searchParams.set("hostOrigin", bridge.origin);
          url.searchParams.set("appId", appId);
          history.replaceState(null, "", url);
        }
      }
      appearance();
      navigate();
      visibility();
      window.addEventListener("message", receive);
      if (bridge.origin)
        parent.postMessage(
          createAppMessage(appId, { type: "ready" }),
          bridge.origin,
        );
      dark.addEventListener("change", appearance);
      reduced.addEventListener("change", appearance);
      window.addEventListener("storage", appearance);
      window.addEventListener("popstate", navigate);
      document.addEventListener("visibilitychange", visibility);
      cleanup(() => {
        window.removeEventListener("message", receive);
        dark.removeEventListener("change", appearance);
        reduced.removeEventListener("change", appearance);
        window.removeEventListener("storage", appearance);
        window.removeEventListener("popstate", navigate);
        document.removeEventListener("visibilitychange", visibility);
      });
    });
    return (
      <main
        data-window-body
        data-standalone-content
        class="h-dvh min-h-0 overflow-auto overscroll-contain bg-glass text-content antialiased pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]"
      >
        <App host={state} />
      </main>
    );
  },
);
