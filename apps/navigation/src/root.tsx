import { component$ } from "@qwik.dev/core";
import { QwikRouterProvider, RouterOutlet } from "@qwik.dev/router";
import "@workspace/theme";
export default component$(() => (
  <QwikRouterProvider>
    <head>
      <meta charSet="utf-8" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, viewport-fit=cover"
      />
      <title>应用导航 · 设计、开发与实用网站 · draco.dev</title>
      <meta
        name="description"
        content="按设计、前端、产品与运营等分类探索实用网站和软件工具，搜索网站名称与说明，从应用导航直接访问原站。"
      />
      <link rel="canonical" href="https://draco.dev/navigation" />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="zh_CN" />
      <meta property="og:site_name" content="draco.dev" />
      <meta
        property="og:title"
        content="应用导航 · 设计、开发与实用网站 · draco.dev"
      />
      <meta
        property="og:description"
        content="按设计、前端、产品与运营等分类探索实用网站和软件工具，搜索网站名称与说明，从应用导航直接访问原站。"
      />
      <meta property="og:url" content="https://draco.dev/navigation" />
      <meta
        property="og:image"
        content="https://draco.dev/wallpapers/alpine.webp"
      />
      <meta property="og:image:alt" content="Draco 个人桌面的雪山与湖泊壁纸" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:title"
        content="应用导航 · 设计、开发与实用网站 · draco.dev"
      />
      <meta
        name="twitter:description"
        content="按设计、前端、产品与运营等分类探索实用网站和软件工具，搜索网站名称与说明，从应用导航直接访问原站。"
      />
      <meta
        name="twitter:image"
        content="https://draco.dev/wallpapers/alpine.webp"
      />
      <link
        rel="icon"
        href="https://draco.dev/favicon.svg"
        type="image/svg+xml"
      />
    </head>
    <body>
      <RouterOutlet />
    </body>
  </QwikRouterProvider>
));
