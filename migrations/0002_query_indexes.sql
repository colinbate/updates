CREATE INDEX IF NOT EXISTS idx_articles_visible_recency
	ON articles(dismissed, published_at DESC, discovered_at DESC);

CREATE INDEX IF NOT EXISTS idx_articles_saved_recency
	ON articles(saved, published_at DESC, discovered_at DESC);

CREATE INDEX IF NOT EXISTS idx_article_streams_highlighted_article
	ON article_streams(highlighted, article_id);

CREATE INDEX IF NOT EXISTS idx_feeds_enabled_title
	ON feeds(enabled, title);
