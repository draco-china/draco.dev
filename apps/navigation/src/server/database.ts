import type {
  D1Database,
  D1PreparedStatement,
} from "@cloudflare/workers-types";
import type { SourceSite } from "./source";

const SOURCE = "chuangzaoshi";
export async function replaceSnapshot(
  db: D1Database,
  sites: SourceSite[],
  updatedAt = new Date().toISOString(),
) {
  if (!sites.length) throw new Error("empty snapshot");
  const snapshot = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [];
  for (let index = 0; index < sites.length; index += 50) {
    const chunk = sites
      .slice(index, index + 50)
      .map((site, i) => ({ ...site, position: index + i }));
    statements.push(
      db
        .prepare(
          `INSERT INTO navigation_sites(source,id,payload,position,snapshot) SELECT ?,json_extract(value,'$.id'),json_remove(value,'$.position'),json_extract(value,'$.position'),? FROM json_each(?) WHERE 1 ON CONFLICT(source,id) DO UPDATE SET payload=CASE WHEN json_extract(excluded.payload,'$.iconSource') IS NOT json_extract(navigation_sites.payload,'$.iconSource') THEN json_set(excluded.payload,'$.iconFallbackSource',COALESCE((SELECT url FROM navigation_images WHERE url=json_extract(navigation_sites.payload,'$.iconSource') AND icon_url IS NOT NULL),json_extract(navigation_sites.payload,'$.iconFallbackSource'))) ELSE json_set(excluded.payload,'$.iconFallbackSource',json_extract(navigation_sites.payload,'$.iconFallbackSource')) END,position=excluded.position,snapshot=excluded.snapshot`,
        )
        .bind(SOURCE, snapshot, JSON.stringify(chunk)),
    );
  }
  statements.push(
    db
      .prepare("DELETE FROM navigation_sites WHERE source=? AND snapshot<>?")
      .bind(SOURCE, snapshot),
  );
  statements.push(
    db
      .prepare(
        "INSERT INTO navigation_sources(source,updated_at,count) VALUES(?,?,?) ON CONFLICT(source) DO UPDATE SET updated_at=excluded.updated_at,count=excluded.count",
      )
      .bind(SOURCE, updatedAt, sites.length),
  );
  await db.batch(statements);
}
export async function readSnapshot(db: D1Database) {
  const results = await db.batch([
    db
      .prepare(
        "SELECT s.payload,COALESCE(i.icon_url,f.icon_url) AS icon_url FROM navigation_sites s LEFT JOIN navigation_images i ON i.url=json_extract(s.payload,'$.iconSource') LEFT JOIN navigation_images f ON f.url=json_extract(s.payload,'$.iconFallbackSource') WHERE s.source=? ORDER BY s.position",
      )
      .bind(SOURCE),
    db
      .prepare("SELECT updated_at FROM navigation_sources WHERE source=?")
      .bind(SOURCE),
  ]);
  const sites = (
    results[0].results as { payload: string; icon_url: string | null }[]
  ).map((row) => {
    const {
      iconSource: _source,
      iconFallbackSource: _fallback,
      ...site
    } = JSON.parse(row.payload) as SourceSite & { iconFallbackSource?: string };
    return { ...site, ...(row.icon_url ? { iconUrl: row.icon_url } : {}) };
  });
  return {
    sites,
    categories: [...new Set(sites.map((site) => site.category))],
    updatedAt:
      (results[1].results[0] as { updated_at: string } | undefined)
        ?.updated_at ?? null,
  };
}

export async function needsSourceSync(db: D1Database, now = new Date()) {
  const row = await db
    .prepare("SELECT updated_at FROM navigation_sources WHERE source=?")
    .bind(SOURCE)
    .first<{ updated_at: string }>();
  const boundary = new Date(now);
  boundary.setUTCHours(20, 0, 0, 0);
  if (boundary > now) boundary.setUTCDate(boundary.getUTCDate() - 1);
  return (
    !row ||
    !Number.isFinite(Date.parse(row.updated_at)) ||
    Date.parse(row.updated_at) < boundary.getTime()
  );
}
