CREATE TABLE contact_attempts (
  ip_hash TEXT NOT NULL,
  hour TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (ip_hash, hour)
);
