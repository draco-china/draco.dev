import { featuredSites } from "../featured";
import { readSnapshot, replaceSnapshot } from "./database";
import type { NavigationEnv } from "./env";
import { iconResponse } from "./icon-response";
import { syncImages } from "./images";
import { collectSource } from "./source";

export async function sync(env: NavigationEnv) {
  const sites = await collectSource();
  await replaceSnapshot(env.DB, sites);
  const images = await syncImages(env.DB, env.ICONS);
  console.info("navigation.sync", { sites: sites.length, images });
  return sites.length;
}
export default {
  async fetch(request: Request, env: NavigationEnv) {
    const url = new URL(request.url);
    const headers = {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    if (
      request.headers.get("Origin") &&
      request.headers.get("Origin") !== url.origin
    )
      return Response.json(
        { error: "origin rejected" },
        { status: 403, headers },
      );
    if (url.pathname === "/api/navigation" && request.method === "GET") {
      try {
        const icon = url.searchParams.get("icon");
        if (icon) return await iconResponse(request, env, icon);
        const snapshot = await readSnapshot(env.DB);
        const result =
          url.searchParams.get("view") === "featured"
            ? { ...snapshot, sites: featuredSites(snapshot.sites) }
            : snapshot;
        return Response.json(result, {
          headers,
        });
      } catch {
        return Response.json(
          { error: "目录暂时无法读取" },
          { status: 503, headers },
        );
      }
    }
    if (url.pathname === "/api/navigation/sync" && request.method === "POST") {
      if (
        !env.NAVIGATION_SYNC_SECRET ||
        request.headers.get("Authorization") !==
          `Bearer ${env.NAVIGATION_SYNC_SECRET}`
      )
        return Response.json(
          { error: "unauthorized" },
          { status: 401, headers },
        );
      try {
        return Response.json(
          url.searchParams.get("images") === "1"
            ? await syncImages(env.DB, env.ICONS)
            : { count: await sync(env) },
          { headers },
        );
      } catch {
        return Response.json(
          { error: "同步失败，保留上次目录" },
          { status: 503, headers },
        );
      }
    }
    return Response.json({ error: "not found" }, { status: 404, headers });
  },
};
