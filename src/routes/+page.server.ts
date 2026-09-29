import { fail } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { Actions, PageServerLoad } from './$types';
import { all, first, id, now } from '../lib/server/db';
import { pollFeeds, retryArticle } from '../lib/server/processing/poll';
import type { ContentMode, FeedRow, StreamRow } from '../lib/server/types';

const ARTICLE_LIST_SQL = `
	SELECT
		a.id, a.title, a.author, a.url, a.canonical_url, a.published_at, a.discovered_at,
		a.saved, a.dismissed, a.read_at, a.processing_status, a.last_processing_error,
		f.title AS feed_title,
		aa.article_type, aa.quality, aa.summary_json,
		group_concat(ast.stream_id || '::' || ast.relevance || '::' || coalesce(ast.reason, '') || '::' || ast.highlighted, '|||') AS stream_scores
	FROM articles a
	JOIN feeds f ON f.id = a.feed_id
	LEFT JOIN article_analysis aa ON aa.article_id = a.id
	LEFT JOIN article_streams ast ON ast.article_id = a.id
	GROUP BY a.id
	ORDER BY coalesce(a.published_at, a.discovered_at) DESC
	LIMIT 250`;

function database() {
	return env.DB;
}

function text(form: FormData, key: string, required = true) {
	const value = String(form.get(key) ?? '').trim();
	if (required && !value) throw new Error(`${key} is required`);
	return value;
}

function number(form: FormData, key: string, fallback: number) {
	const value = Number(form.get(key));
	return Number.isFinite(value) ? value : fallback;
}

function bool(form: FormData, key: string) {
	return form.get(key) === 'on' || form.get(key) === 'true' || form.get(key) === '1';
}

function actionError(error: unknown) {
	return fail(400, {
		error: error instanceof Error ? error.message : 'The request could not be completed'
	});
}

export const load: PageServerLoad = async () => {
	const db = database();
	if (!db) {
		return {
			configured: false,
			streams: [],
			feeds: [],
			feedStreams: [],
			articles: [],
			metrics: [],
			stats: { articles: 0, saved: 0, highlights: 0, feeds: 0, unhealthyFeeds: 0 }
		};
	}

	const [streams, feeds, feedStreams, articles, metrics, stats] = await Promise.all([
		all<StreamRow>(db, 'SELECT * FROM streams ORDER BY enabled DESC, name'),
		all<FeedRow>(db, 'SELECT * FROM feeds ORDER BY enabled DESC, title'),
		all<{ feed_id: string; stream_id: string; prior_weight: number }>(
			db,
			'SELECT * FROM feed_streams ORDER BY feed_id, stream_id'
		),
		all<Record<string, unknown>>(db, ARTICLE_LIST_SQL),
		all<{ day: string; metric: string; value: number }>(
			db,
			"SELECT day, metric, value FROM daily_metrics WHERE day >= date('now', '-13 days') ORDER BY day DESC, metric"
		),
		first<{
			articles: number;
			saved: number;
			highlights: number;
			feeds: number;
			unhealthyFeeds: number;
		}>(
			db,
			`SELECT
				(SELECT count(*) FROM articles WHERE dismissed = 0) AS articles,
				(SELECT count(*) FROM articles WHERE saved = 1) AS saved,
				(SELECT count(DISTINCT article_id) FROM article_streams WHERE highlighted = 1) AS highlights,
				(SELECT count(*) FROM feeds) AS feeds,
				(SELECT count(*) FROM feeds WHERE consecutive_errors > 0) AS unhealthyFeeds`
		)
	]);

	return {
		configured: true,
		streams,
		feeds,
		feedStreams,
		articles,
		metrics,
		stats: stats ?? { articles: 0, saved: 0, highlights: 0, feeds: 0, unhealthyFeeds: 0 }
	};
};

export const actions: Actions = {
	article: async ({ request }) => {
		try {
			const db = database();
			if (!db) throw new Error('D1 is not configured');
			const form = await request.formData();
			const articleId = text(form, 'articleId');
			const operation = text(form, 'operation');
			if (operation === 'save') {
				await db
					.prepare(
						'UPDATE articles SET saved = CASE saved WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?'
					)
					.bind(now(), articleId)
					.run();
			} else if (operation === 'dismiss') {
				await db
					.prepare('UPDATE articles SET dismissed = 1, updated_at = ? WHERE id = ?')
					.bind(now(), articleId)
					.run();
			} else if (operation === 'read') {
				await db
					.prepare(
						'UPDATE articles SET read_at = coalesce(read_at, ?), updated_at = ? WHERE id = ?'
					)
					.bind(now(), now(), articleId)
					.run();
			} else if (operation === 'retry') {
				if (!env.AI) throw new Error('Workers AI is not configured');
				await retryArticle({ DB: db, AI: env.AI, BROWSER: env.BROWSER }, articleId);
			} else {
				throw new Error('Unknown article operation');
			}
			return { success: true };
		} catch (error) {
			return actionError(error);
		}
	},

	bulkDismiss: async ({ request }) => {
		try {
			const db = database();
			if (!db) throw new Error('D1 is not configured');
			const form = await request.formData();
			const ids = form.getAll('articleId').map(String).filter(Boolean).slice(0, 250);
			if (!ids.length) return { success: true };
			await db.batch(
				ids.map((articleId) =>
					db
						.prepare('UPDATE articles SET dismissed = 1, updated_at = ? WHERE id = ? AND saved = 0')
						.bind(now(), articleId)
				)
			);
			return { success: true };
		} catch (error) {
			return actionError(error);
		}
	},

	saveFeed: async ({ request }) => {
		try {
			const db = database();
			if (!db) throw new Error('D1 is not configured');
			const form = await request.formData();
			const feedId = text(form, 'id', false) || id('feed');
			const url = new URL(text(form, 'url')).toString();
			const contentMode = text(form, 'contentMode') as ContentMode;
			if (!['feed_only', 'browser_if_thin', 'browser_always'].includes(contentMode)) {
				throw new Error('Invalid content mode');
			}
			const timestamp = now();
			await db
				.prepare(
					`INSERT INTO feeds (id, title, url, enabled, content_mode, minimum_useful_content_chars, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
					 ON CONFLICT(id) DO UPDATE SET title = excluded.title, url = excluded.url,
					 enabled = excluded.enabled, content_mode = excluded.content_mode,
					 minimum_useful_content_chars = excluded.minimum_useful_content_chars, updated_at = excluded.updated_at`
				)
				.bind(
					feedId,
					text(form, 'title'),
					url,
					bool(form, 'enabled') ? 1 : 0,
					contentMode,
					Math.max(0, Math.round(number(form, 'minimumUsefulContentChars', 800))),
					timestamp,
					timestamp
				)
				.run();

			const streamIds = new Set(form.getAll('streamId').map(String));
			const streams = await all<{ id: string }>(db, 'SELECT id FROM streams');
			await db.batch([
				db.prepare('DELETE FROM feed_streams WHERE feed_id = ?').bind(feedId),
				...streams
					.filter((stream) => streamIds.has(stream.id))
					.map((stream) =>
						db
							.prepare(
								'INSERT INTO feed_streams (feed_id, stream_id, prior_weight) VALUES (?, ?, ?)'
							)
							.bind(feedId, stream.id, 0.15)
					)
			]);
			return { success: true };
		} catch (error) {
			return actionError(error);
		}
	},

	deleteFeed: async ({ request }) => {
		try {
			const db = database();
			if (!db) throw new Error('D1 is not configured');
			const form = await request.formData();
			await db.prepare('DELETE FROM feeds WHERE id = ?').bind(text(form, 'id')).run();
			return { success: true };
		} catch (error) {
			return actionError(error);
		}
	},

	pollFeed: async ({ request }) => {
		try {
			if (!env.DB || !env.AI) throw new Error('Cloudflare bindings are not configured');
			const form = await request.formData();
			const result = await pollFeeds(
				{ DB: env.DB, AI: env.AI, BROWSER: env.BROWSER },
				text(form, 'id')
			);
			return { success: true, pollResult: result };
		} catch (error) {
			return actionError(error);
		}
	},

	saveStream: async ({ request }) => {
		try {
			const db = database();
			if (!db) throw new Error('D1 is not configured');
			const form = await request.formData();
			const streamId = text(form, 'id', false) || id('stream');
			const relevanceThreshold = Math.max(0, Math.min(1, number(form, 'relevanceThreshold', 0.6)));
			const highlightThreshold = Math.max(
				relevanceThreshold,
				Math.min(1, number(form, 'highlightThreshold', 0.85))
			);
			const timestamp = now();
			await db
				.prepare(
					`INSERT INTO streams (
					 id, name, description, relevance_instructions, summary_instructions, enabled,
					 relevance_threshold, highlight_threshold, created_at, updated_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description,
					 relevance_instructions = excluded.relevance_instructions,
					 summary_instructions = excluded.summary_instructions, enabled = excluded.enabled,
					 relevance_threshold = excluded.relevance_threshold,
					 highlight_threshold = excluded.highlight_threshold, updated_at = excluded.updated_at`
				)
				.bind(
					streamId,
					text(form, 'name'),
					text(form, 'description', false),
					text(form, 'relevanceInstructions'),
					text(form, 'summaryInstructions', false) || null,
					bool(form, 'enabled') ? 1 : 0,
					relevanceThreshold,
					highlightThreshold,
					timestamp,
					timestamp
				)
				.run();
			return { success: true };
		} catch (error) {
			return actionError(error);
		}
	},

	deleteStream: async ({ request }) => {
		try {
			const db = database();
			if (!db) throw new Error('D1 is not configured');
			const form = await request.formData();
			await db.prepare('DELETE FROM streams WHERE id = ?').bind(text(form, 'id')).run();
			return { success: true };
		} catch (error) {
			return actionError(error);
		}
	}
};
