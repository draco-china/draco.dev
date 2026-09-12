export interface BrowserSite {
  url: string;
  sandbox: string;
  allow?: string;
}
export function browserPermissions(url: string, sites: readonly BrowserSite[]) {
  const fallback = {
    sandbox: "allow-scripts allow-same-origin allow-forms allow-popups",
    allow: undefined,
  };
  try {
    const origin = new URL(url).origin;
    const site = sites.find((site) => new URL(site.url).origin === origin);
    return site ? { sandbox: site.sandbox, allow: site.allow } : fallback;
  } catch {
    return fallback;
  }
}
