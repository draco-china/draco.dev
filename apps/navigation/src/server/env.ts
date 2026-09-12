import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
export interface NavigationEnv {
  DB: D1Database;
  ICONS: R2Bucket;
  NAVIGATION_SYNC_SECRET?: string;
}
