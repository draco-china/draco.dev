CREATE TABLE IF NOT EXISTS navigation_sites (
 source TEXT NOT NULL,
 id TEXT NOT NULL,
 payload TEXT NOT NULL,
 position INTEGER NOT NULL,
 snapshot TEXT NOT NULL,
 PRIMARY KEY (source, id)
);
CREATE TABLE IF NOT EXISTS navigation_sources (
 source TEXT PRIMARY KEY,
 updated_at TEXT NOT NULL,
 count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS navigation_images (
  url TEXT PRIMARY KEY,
  data_url TEXT,
  attempted_at TEXT NOT NULL
);
