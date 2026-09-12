import { featuredCatalog } from "./featured-catalog";
import type { Site } from "./model";

// Editorial shortcuts from the first four directory groups; this is not a traffic ranking.
export function featuredSites(sites: Site[]): Site[] {
  return featuredCatalog.map((preset) => {
    const actual = sites.find(
      (site) =>
        site.id === preset.id &&
        site.group === preset.group &&
        site.section !== "downloads",
    );
    return {
      ...preset,
      ...actual,
      name: preset.name,
      iconDataUrl: actual?.iconDataUrl || preset.iconDataUrl,
    };
  });
}
