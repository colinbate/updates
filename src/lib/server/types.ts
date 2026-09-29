export type ContentMode = 'feed_only' | 'browser_if_thin' | 'browser_always';
export type ArticleType =
	| 'news'
	| 'release'
	| 'tutorial'
	| 'analysis'
	| 'opinion'
	| 'announcement'
	| 'discussion'
	| 'reference'
	| 'event'
	| 'sponsored'
	| 'other';

export interface FeedRow {
	id: string;
	title: string;
	url: string;
	enabled: number;
	content_mode: ContentMode;
	minimum_useful_content_chars: number;
	etag: string | null;
	last_modified: string | null;
	last_polled_at: string | null;
	last_successful_poll_at: string | null;
	last_error: string | null;
	consecutive_errors: number;
	created_at: string;
	updated_at: string;
}

export interface StreamRow {
	id: string;
	name: string;
	description: string;
	relevance_instructions: string;
	summary_instructions: string | null;
	enabled: number;
	relevance_threshold: number;
	highlight_threshold: number;
	created_at: string;
	updated_at: string;
}

export interface ArticleRow {
	id: string;
	feed_id: string;
	dedupe_key: string;
	guid: string | null;
	url: string;
	canonical_url: string | null;
	title: string;
	author: string | null;
	published_at: string | null;
	discovered_at: string;
	feed_summary: string | null;
	feed_content: string | null;
	analysis_content: string | null;
	analysis_content_source: 'feed_content' | 'feed_summary' | 'browser_markdown' | 'none';
	content_hash: string | null;
	browser_fetch_status: 'not_requested' | 'success' | 'failed' | 'skipped';
	browser_fetch_error: string | null;
	browser_ms_used: number | null;
	processing_status: 'discovered' | 'content_ready' | 'triaged' | 'summarized' | 'failed';
	processing_attempts: number;
	last_processing_error: string | null;
	saved: number;
	dismissed: number;
	read_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface ParsedEntry {
	guid: string | null;
	url: string;
	canonicalUrl: string;
	title: string;
	author: string | null;
	publishedAt: string | null;
	summary: string | null;
	content: string | null;
}

export interface TriageResult {
	articleType: ArticleType;
	quality: number;
	streams: Array<{ streamId: string; relevance: number; reason: string }>;
	summarize: boolean;
}

export interface ArticleSummary {
	whatHappened: string;
	whyItMatters: string | null;
	keyDetails: string[];
	worthReadingReason: string | null;
}

export interface PollResult {
	feedsPolled: number;
	feedsFailed: number;
	articlesDiscovered: number;
	articlesDeduplicated: number;
	articlesTriaged: number;
	articlesSummarized: number;
}

export interface ArticleScore {
	streamId: string;
	relevance: number;
	reason: string | null;
	highlighted: boolean;
}

export interface ArticleListItem {
	id: string;
	title: string;
	author: string | null;
	url: string;
	canonical_url: string | null;
	published_at: string | null;
	discovered_at: string;
	saved: number;
	dismissed: number;
	read_at: string | null;
	processing_status: ArticleRow['processing_status'];
	last_processing_error: string | null;
	feed_title: string;
	article_type: ArticleType | null;
	quality: number | null;
	summary: ArticleSummary | null;
	scores: ArticleScore[];
}

export interface FeedStreamRow {
	feed_id: string;
	stream_id: string;
	prior_weight: number;
}

export interface AppStats {
	articles: number;
	saved: number;
	highlights: number;
	feeds: number;
	unhealthyFeeds: number;
}

export interface DailyMetric {
	day: string;
	metric: string;
	value: number;
}

export interface ProcessingStats {
	pending: number;
	triaged: number;
	summarized: number;
	failed: number;
}

export interface ProcessingErrorSummary {
	message: string;
	occurrences: number;
	latestAt: string;
}
