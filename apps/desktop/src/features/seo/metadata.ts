import { profile } from "@workspace/about/profile";

export const SITE_ORIGIN = "https://draco.dev";
export const PUBLIC_PATHS = ["/", "/about", "/music", "/navigation"] as const;
const pages = {
  "/": {
    title: "Draco 的个人桌面 · draco.dev",
    description:
      "Draco 的个人桌面，汇集个人介绍、音乐和应用导航。在熟悉的桌面中搜索信息、发现实用网站，了解我的开发经历与技术探索。",
    name: "Draco 的个人桌面",
  },
  "/about": {
    title: "关于 Draco · 全栈开发者 · draco.dev",
    description:
      "你好，我是 Draco，一名关注 Web 与云原生的全栈开发者。目前从事自由职业，负责前后端开发与部署维护，持续打磨产品。这里记录我的技术偏好与工作经历。",
    name: "关于 Draco",
  },
  "/music": {
    title: "音乐 · draco.dev",
    description:
      "在 Draco 的个人桌面听音乐，浏览歌曲、搜索曲目、查看歌词，使用播放列表与播放控制，让喜欢的旋律陪伴日常。",
    name: "音乐",
  },
  "/navigation": {
    title: "应用导航 · 设计、开发与实用网站 · draco.dev",
    description:
      "按设计、前端、产品与运营等分类探索实用网站和软件工具，搜索网站名称与说明，从应用导航直接访问原站。",
    name: "应用导航",
  },
} as const;

/** Canonicals always use the public origin, never a preview host or browser URL. */
export function getPageSeo(input: string | URL) {
  const url = new URL(input, SITE_ORIGIN);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const requestedApp = url.searchParams.get("app");
  const selectedPath =
    pathname === "/" && requestedApp ? `/${requestedApp}` : pathname;
  const indexable = Object.hasOwn(pages, selectedPath);
  const page = pages[indexable ? (selectedPath as keyof typeof pages) : "/"];
  const canonical = `${SITE_ORIGIN}${indexable ? selectedPath : pathname}`;
  const person = {
    "@type": "Person",
    "@id": `${SITE_ORIGIN}/about#person`,
    name: profile.name,
    description: profile.bio,
    url: `${SITE_ORIGIN}/about`,
    sameAs: ["https://github.com/draco-china"],
    knowsAbout: profile.stack.flatMap((group) => group.items),
  };
  const structuredData = indexable
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": `${SITE_ORIGIN}/#website`,
            name: "draco.dev",
            alternateName: "Draco 的个人桌面",
            url: `${SITE_ORIGIN}/`,
            inLanguage: "zh-CN",
            author: { "@id": `${SITE_ORIGIN}/about#person` },
          },
          person,
          {
            "@type":
              selectedPath === "/about"
                ? "ProfilePage"
                : selectedPath === "/navigation"
                  ? "CollectionPage"
                  : "WebPage",
            "@id": `${canonical}#webpage`,
            name: page.name,
            description: page.description,
            url: canonical,
            inLanguage: "zh-CN",
            isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
            ...(selectedPath === "/about"
              ? { mainEntity: { "@id": `${SITE_ORIGIN}/about#person` } }
              : {}),
          },
        ],
      }
    : undefined;
  return {
    ...page,
    canonical,
    indexable,
    robots: indexable
      ? "index, follow, max-image-preview:large"
      : "noindex, follow",
    image: `${SITE_ORIGIN}/wallpapers/alpine.webp`,
    imageAlt: "Draco 个人桌面的雪山与湖泊壁纸",
    structuredData,
  };
}

/** Escape HTML-significant code points before embedding JSON in a script. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
