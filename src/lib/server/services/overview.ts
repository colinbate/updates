import { all, first } from '../db';
import type { AppStats, DailyMetric } from '../types';

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
