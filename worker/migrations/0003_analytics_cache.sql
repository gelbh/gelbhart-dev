CREATE TABLE analytics_cache (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
