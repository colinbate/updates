import { all, first } from '../db';
import type { AppStats, DailyMetric, ProcessingErrorSummary, ProcessingStats } from '../types';

const EMPTY_STATS: AppStats = {
	articles: 0,
	saved: 0,
	highlights: 0,
	feeds: 0,
	unhealthyFeeds: 0
};

export async function getStats(db: D1Database) {
	return (
		(await first<AppStats>(
			db,
			`SELECT
				(SELECT count(*) FROM articles WHERE dismissed = 0) AS articles,
				(SELECT count(*) FROM articles WHERE saved = 1) AS saved,
				(SELECT count(DISTINCT article_id) FROM article_streams WHERE highlighted = 1) AS highlights,
				(SELECT count(*) FROM feeds) AS feeds,
				(SELECT count(*) FROM feeds WHERE consecutive_errors > 0) AS unhealthyFeeds`
		)) ?? EMPTY_STATS
	);
}

export function listMetrics(db: D1Database) {
	return all<DailyMetric>(
		db,
		`SELECT day, metric, value
		 FROM daily_metrics
		 WHERE day >= date('now', '-13 days')
		 ORDER BY day DESC, metric`
	);
}

const EMPTY_PROCESSING_STATS: ProcessingStats = {
	pending: 0,
	triaged: 0,
	summarized: 0,
	failed: 0
};

export async function getProcessingStats(db: D1Database) {
	return (
		(await first<ProcessingStats>(
			db,
			`SELECT
				coalesce(sum(CASE WHEN processing_status IN ('discovered', 'content_ready') THEN 1 ELSE 0 END), 0) AS pending,
				coalesce(sum(CASE WHEN processing_status = 'triaged' THEN 1 ELSE 0 END), 0) AS triaged,
				coalesce(sum(CASE WHEN processing_status = 'summarized' THEN 1 ELSE 0 END), 0) AS summarized,
				coalesce(sum(CASE WHEN processing_status = 'failed' THEN 1 ELSE 0 END), 0) AS failed
			 FROM articles
			 WHERE dismissed = 0`
		)) ?? EMPTY_PROCESSING_STATS
	);
}

export function listProcessingErrors(db: D1Database) {
	return all<ProcessingErrorSummary>(
		db,
		`SELECT
			coalesce(last_processing_error, 'Unknown processing error') AS message,
			count(*) AS occurrences,
			max(updated_at) AS latestAt
		 FROM articles
		 WHERE processing_status = 'failed'
		 GROUP BY last_processing_error
		 ORDER BY occurrences DESC, latestAt DESC
		 LIMIT 20`
	);
}
