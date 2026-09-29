PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS streams (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	relevance_instructions TEXT NOT NULL DEFAULT '',
	summary_instructions TEXT,
	enabled INTEGER NOT NULL DEFAULT 1,
	relevance_threshold REAL NOT NULL DEFAULT 0.6 CHECK (relevance_threshold BETWEEN 0 AND 1),
	highlight_threshold REAL NOT NULL DEFAULT 0.85 CHECK (highlight_threshold BETWEEN 0 AND 1),
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feeds (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	url TEXT NOT NULL UNIQUE,
	enabled INTEGER NOT NULL DEFAULT 1,
	content_mode TEXT NOT NULL DEFAULT 'browser_if_thin' CHECK (content_mode IN ('feed_only', 'browser_if_thin', 'browser_always')),
	minimum_useful_content_chars INTEGER NOT NULL DEFAULT 800,
	etag TEXT,
	last_modified TEXT,
	last_polled_at TEXT,
	last_successful_poll_at TEXT,
	last_error TEXT,
	consecutive_errors INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feed_streams (
	feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
	stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
	prior_weight REAL NOT NULL DEFAULT 0.15,
	PRIMARY KEY (feed_id, stream_id)
);

CREATE TABLE IF NOT EXISTS articles (
	id TEXT PRIMARY KEY,
	feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
	dedupe_key TEXT NOT NULL UNIQUE,
	guid TEXT,
	url TEXT NOT NULL,
	canonical_url TEXT,
	title TEXT NOT NULL,
	author TEXT,
	published_at TEXT,
	discovered_at TEXT NOT NULL,
	feed_summary TEXT,
	feed_content TEXT,
	analysis_content TEXT,
	analysis_content_source TEXT NOT NULL DEFAULT 'none' CHECK (analysis_content_source IN ('feed_content', 'feed_summary', 'browser_markdown', 'none')),
	content_hash TEXT,
	browser_fetch_status TEXT NOT NULL DEFAULT 'not_requested' CHECK (browser_fetch_status IN ('not_requested', 'success', 'failed', 'skipped')),
	browser_fetch_error TEXT,
	browser_ms_used INTEGER,
	processing_status TEXT NOT NULL DEFAULT 'discovered' CHECK (processing_status IN ('discovered', 'content_ready', 'triaged', 'summarized', 'failed')),
	processing_attempts INTEGER NOT NULL DEFAULT 0,
	last_processing_error TEXT,
	saved INTEGER NOT NULL DEFAULT 0,
	dismissed INTEGER NOT NULL DEFAULT 0,
	read_at TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS article_analysis (
	article_id TEXT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
	article_type TEXT NOT NULL,
	quality REAL NOT NULL,
	stage1_model TEXT NOT NULL,
	stage1_prompt_version TEXT NOT NULL,
	stage1_result_json TEXT NOT NULL,
	stage2_model TEXT,
	stage2_prompt_version TEXT,
	summary_json TEXT,
	analyzed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS article_streams (
	article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
	stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
	relevance REAL NOT NULL CHECK (relevance BETWEEN 0 AND 1),
	reason TEXT,
	highlighted INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL,
	PRIMARY KEY (article_id, stream_id)
);

CREATE TABLE IF NOT EXISTS daily_metrics (
	day TEXT NOT NULL,
	metric TEXT NOT NULL,
	value INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (day, metric)
);

CREATE TABLE IF NOT EXISTS app_settings (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_feed_published ON articles(feed_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_discovered ON articles(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_state ON articles(saved, dismissed);
CREATE INDEX IF NOT EXISTS idx_article_streams_stream_relevance ON article_streams(stream_id, relevance DESC);

INSERT OR IGNORE INTO streams (
	id, name, description, relevance_instructions, summary_instructions,
	relevance_threshold, highlight_threshold, created_at, updated_at
) VALUES (
	'work', 'Work', 'Engineering, platforms, and developer tools',
	'Prioritize concrete technical updates about Cloudflare, Svelte, TypeScript, browser APIs, developer tooling, AI systems, and detailed engineering postmortems. Downrank generic opinion, events, and corporate marketing.',
	'Preserve versions, APIs, migration implications, and practical engineering details.',
	0.6, 0.85, datetime('now'), datetime('now')
);

