import { first, metric } from '../db';

export async function cleanupExpired(db: D1Database) {
	const result = await db
		.prepare(
			`DELETE FROM articles
			 WHERE saved = 0 AND (
				(dismissed = 1 AND discovered_at < datetime('now', '-7 days'))
				OR (dismissed = 0 AND discovered_at < datetime('now', '-30 days'))
				OR (
					discovered_at < datetime('now', '-7 days')
					AND NOT EXISTS (
						SELECT 1 FROM article_streams s
						JOIN streams st ON st.id = s.stream_id
						WHERE s.article_id = articles.id AND s.relevance >= st.relevance_threshold
					)
				)
			)`
		)
		.run();
	const deleted = result.meta.changes ?? 0;
	if (deleted) await metric(db, 'articles_expired', deleted);
	const remaining = await first<{ count: number }>(db, 'SELECT count(*) AS count FROM articles');
	return { deleted, remaining: remaining?.count ?? 0 };
}
