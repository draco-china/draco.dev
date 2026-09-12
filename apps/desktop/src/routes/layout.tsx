import { component$, Slot } from "@qwik.dev/core";
import { routeLoader$, useLocation, useNavigate } from "@qwik.dev/router";
import { fallbackLibrary, parseLibrary } from "@workspace/navigation/library";
import { Desktop } from "../features/desktop/desktop";
import { defaultSite } from "../features/site/model";
export const useNavigationLibrary = routeLoader$(
  async ({ platform, url }) => {
    if (
      url.pathname !== "/navigation/" &&
      url.pathname !== "/navigation" &&
      url.searchParams.get("app") !== "navigation"
    )
      return undefined;
    const binding = platform.env?.NAVIGATION as
      | { fetch(request: Request): Promise<Response> }
      | undefined;
    try {
      if (binding) {
        const response = await binding.fetch(
          new Request(new URL("/api/navigation", url)),
        );
        if (response.ok) return parseLibrary(await response.json());
      } else if (import.meta.env.DEV) {
        const response = await fetch("http://127.0.0.1:8787/api/navigation", {
          signal: AbortSignal.timeout(3000),
        });
        if (response.ok) return parseLibrary(await response.json());
      }
    } catch {}
    return fallbackLibrary();
  },
  { search: ["app"], blockSSR: true },
);
export default component$(() => {
  const location = useLocation();
  const navigation = useNavigationLibrary();
  const navigate = useNavigate();
  return (
    <>
      <Desktop
        initial={defaultSite}
        navigationLibrary={navigation.value}
        onNavigate$={async (url, replace) => {
          await navigate(url, { replaceState: replace, scroll: false });
        }}
        initialApp={
          location.url.pathname.split("/")[1] ||
          location.url.searchParams.get("app") ||
          ""
        }
      />
      <Slot />
    </>
  );
});
