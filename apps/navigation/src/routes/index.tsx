import { component$ } from "@qwik.dev/core";
import { routeLoader$, useLocation } from "@qwik.dev/router";
import type { AppContentProps } from "@workspace/app-sdk";
import { StandaloneApp } from "@workspace/app-sdk/standalone";
import App from "../app";
import { fallbackLibrary, parseLibrary } from "../library";
import { readSnapshot } from "../server/database";
export const useLibrary = routeLoader$(async ({ platform }) => {
  const db = platform.env?.DB;
  try {
    if (db) return parseLibrary(await readSnapshot(db));
  } catch {}
  return fallbackLibrary();
});
const Content = component$<AppContentProps>(({ host }) => {
  const library = useLibrary();
  return <App host={host} initialLibrary={library.value} />;
});
export default component$(() => {
  const location = useLocation();
  return (
    <StandaloneApp
      app={Content}
      appId="navigation"
      title="应用导航 · 设计、开发与实用网站 · draco.dev"
      allowedParentOrigins={["https://draco.dev", location.url.origin]}
    />
  );
});
