import { component$ } from "@qwik.dev/core";
import { getPageSeo, serializeJsonLd } from "./metadata";

export const SeoHead = component$<{ url: string }>(({ url }) => {
  const page = getPageSeo(url);
  return (
    <>
      <title>{page.title}</title>
      <meta name="description" content={page.description} />
      <meta name="robots" content={page.robots} />
      <link rel="canonical" href={page.canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="zh_CN" />
      <meta property="og:site_name" content="draco.dev" />
      <meta property="og:title" content={page.title} />
      <meta property="og:description" content={page.description} />
      <meta property="og:url" content={page.canonical} />
      <meta property="og:image" content={page.image} />
      <meta property="og:image:alt" content={page.imageAlt} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={page.title} />
      <meta name="twitter:description" content={page.description} />
      <meta name="twitter:image" content={page.image} />
      <meta name="twitter:image:alt" content={page.imageAlt} />
      {page.structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={serializeJsonLd(page.structuredData)}
        />
      )}
    </>
  );
});
