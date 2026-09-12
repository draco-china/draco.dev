import type { ExportedHandlerScheduledHandler } from "@cloudflare/workers-types";
import { needsSourceSync } from "./database";
import type { NavigationEnv } from "./env";
import { syncImages } from "./images";
import { sync } from "./index";
export const scheduled: ExportedHandlerScheduledHandler<NavigationEnv> = async (
  _event,
  env,
  ctx,
) => {
  ctx.waitUntil(
    (async () => {
      if (await needsSourceSync(env.DB)) await sync(env);
      else
        console.info("navigation.images", await syncImages(env.DB, env.ICONS));
    })(),
  );
};
