CREATE TABLE IF NOT EXISTS feed_entries (
	feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
	dedupe_key TEXT NOT NULL,
	first_seen_at TEXT NOT NULL,
	imported_at TEXT,
	PRIMARY KEY (feed_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_feed_entries_imported
	ON feed_entries(feed_id, imported_at);
