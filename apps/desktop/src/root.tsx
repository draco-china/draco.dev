import { component$ } from "@qwik.dev/core";
import {
  QwikRouterProvider,
  RouterOutlet,
  useLocation,
} from "@qwik.dev/router";
import "@workspace/theme";
import { SeoHead } from "./features/seo/seo-head";

const Head = component$(() => {
  const location = useLocation();
  return <SeoHead url={location.url.href} />;
});
export default component$(() => (
  <QwikRouterProvider>
    <head>
      <meta charSet="utf-8" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, viewport-fit=cover"
      />
      <Head />
      <link
        rel="preload"
        as="image"
        href="/wallpapers/alpine.webp"
        fetchPriority="high"
      />
      <link rel="icon" href="/favicon.svg" />
    </head>
    <body lang="zh-CN">
      <RouterOutlet />
    </body>
  </QwikRouterProvider>
));
