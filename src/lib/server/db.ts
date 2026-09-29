import type { ArticleRow, FeedRow, StreamRow } from './types';

export function now() {
	return new Date().toISOString();
}

export function id(prefix: string) {
	return `${prefix}_${crypto.randomUUID()}`;
}

export async function all<T>(db: D1Database, sql: string, ...bindings: unknown[]): Promise<T[]> {
	const result = await db
		.prepare(sql)
		.bind(...bindings)
		.all<T>();
	return result.results;
}

export async function first<T>(
	db: D1Database,
	sql: string,
	...bindings: unknown[]
): Promise<T | null> {
	return db
		.prepare(sql)
		.bind(...bindings)
		.first<T>();
}

export async function metric(db: D1Database, name: string, amount = 1) {
	await db
		.prepare(
			`INSERT INTO daily_metrics (day, metric, value) VALUES (date('now'), ?, ?)
			 ON CONFLICT(day, metric) DO UPDATE SET value = value + excluded.value`
		)
		.bind(name, amount)
		.run();
}

export async function getEnabledStreams(db: D1Database) {
	return all<StreamRow>(db, 'SELECT * FROM streams WHERE enabled = 1 ORDER BY name');
}

export async function getFeedPriors(db: D1Database, feedId: string) {
	return all<{ stream_id: string; prior_weight: number }>(
		db,
		'SELECT stream_id, prior_weight FROM feed_streams WHERE feed_id = ?',
		feedId
	);
}

export async function getFeed(db: D1Database, feedId: string) {
	return first<FeedRow>(db, 'SELECT * FROM feeds WHERE id = ?', feedId);
}

export async function getArticle(db: D1Database, articleId: string) {
	return first<ArticleRow>(db, 'SELECT * FROM articles WHERE id = ?', articleId);
}
