import { component$ } from "@qwik.dev/core";
import About from "@workspace/about";
import type { AppHost } from "@workspace/app-sdk";
import { EmbeddedApp } from "@workspace/app-sdk/embedded";
import Music from "@workspace/music";
import Navigation from "@workspace/navigation";
import type { NavigationLibrary } from "@workspace/navigation/library";
import { application } from "./app-registry";
export const ModuleApp = component$<{
  id: string;
  host: AppHost;
  navigationLibrary?: NavigationLibrary;
}>(({ id, host, navigationLibrary }) => {
  const definition = application(id);
  if (definition?.kind === "url")
    return (
      <EmbeddedApp
        host={host}
        appId={id}
        url={definition.url}
        sandbox={definition.sandbox}
        allow={definition.allow}
        bridge={definition.bridge}
      />
    );
  return (
    <div class="contents" data-module-app={id}>
      {id === "about" ? (
        <About host={host} />
      ) : id === "music" ? (
        <Music host={host} />
      ) : id === "navigation" ? (
        <Navigation host={host} initialLibrary={navigationLibrary} />
      ) : (
        <p role="status">应用配置不可用</p>
      )}
    </div>
  );
});
