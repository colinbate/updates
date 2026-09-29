import { all, now } from '../db';
import type { ArticleListItem, ArticleScore, ArticleSummary } from '../types';

export type ArticleView = 'today' | 'highlights' | 'saved' | 'stream';

interface ArticleQueryRow extends Omit<ArticleListItem, 'scores' | 'summary'> {
	summary_json: string | null;
	scores_json: string;
}

const ARTICLE_SELECT = `
	SELECT
		a.id,
		a.title,
		a.author,
		a.url,
		a.canonical_url,
		a.published_at,
		a.discovered_at,
		a.saved,
		a.dismissed,
		a.read_at,
		a.processing_status,
		a.last_processing_error,
		f.title AS feed_title,
		aa.article_type,
		aa.quality,
		aa.summary_json,
		coalesce((
			SELECT json_group_array(json_object(
				'streamId', scores.stream_id,
				'relevance', scores.relevance,
				'reason', scores.reason,
				'highlighted', scores.highlighted = 1
			))
			FROM article_streams scores
			WHERE scores.article_id = a.id
		), '[]') AS scores_json
	FROM articles a
	JOIN feeds f ON f.id = a.feed_id
	LEFT JOIN article_analysis aa ON aa.article_id = a.id`;

const VIEW_FILTERS: Record<ArticleView, string> = {
	today: `a.dismissed = 0 AND EXISTS (
		SELECT 1
		FROM article_streams matched
		JOIN streams s ON s.id = matched.stream_id
		WHERE matched.article_id = a.id
			AND s.enabled = 1
			AND matched.relevance >= s.relevance_threshold
	)`,
	highlights: `a.dismissed = 0 AND EXISTS (
		SELECT 1 FROM article_streams matched
		WHERE matched.article_id = a.id AND matched.highlighted = 1
	)`,
	saved: 'a.saved = 1',
	stream: `a.dismissed = 0 AND EXISTS (
		SELECT 1
		FROM article_streams matched
		JOIN streams s ON s.id = matched.stream_id
		WHERE matched.article_id = a.id
			AND matched.stream_id = ?
			AND matched.relevance >= s.relevance_threshold
	)`
};

function parseJson<T>(value: string | null, fallback: T): T {
	if (!value) return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

export async function listArticles(
	db: D1Database,
	view: ArticleView,
	streamId?: string
): Promise<ArticleListItem[]> {
	const bindings = view === 'stream' ? [streamId] : [];
	const rows = await all<ArticleQueryRow>(
		db,
		`${ARTICLE_SELECT}
		 WHERE ${VIEW_FILTERS[view]}
		 ORDER BY coalesce(a.published_at, a.discovered_at) DESC
		 LIMIT 250`,
		...bindings
	);

	return rows.map(({ scores_json, summary_json, ...article }) => ({
		...article,
		scores: parseJson<ArticleScore[]>(scores_json, []).map((score) => ({
			...score,
			highlighted: Boolean(score.highlighted)
		})),
		summary: parseJson<ArticleSummary | null>(summary_json, null)
	}));
}

export async function updateArticle(
	db: D1Database,
	articleId: string,
	operation: 'save' | 'dismiss' | 'read'
) {
	const timestamp = now();
	if (operation === 'save') {
		return db
			.prepare(
				'UPDATE articles SET saved = CASE saved WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?'
			)
			.bind(timestamp, articleId)
			.run();
	}
	if (operation === 'dismiss') {
		return db
			.prepare('UPDATE articles SET dismissed = 1, updated_at = ? WHERE id = ?')
			.bind(timestamp, articleId)
			.run();
	}
	return db
		.prepare('UPDATE articles SET read_at = coalesce(read_at, ?), updated_at = ? WHERE id = ?')
		.bind(timestamp, timestamp, articleId)
		.run();
}

export async function dismissArticles(db: D1Database, articleIds: string[]) {
	if (!articleIds.length) return;
	const timestamp = now();
	await db.batch(
		articleIds
			.slice(0, 250)
			.map((articleId) =>
				db
					.prepare('UPDATE articles SET dismissed = 1, updated_at = ? WHERE id = ? AND saved = 0')
					.bind(timestamp, articleId)
			)
	);
}
