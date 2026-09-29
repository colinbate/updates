import { acquireContent } from '../content/acquire';
import { all, getArticle, getEnabledStreams, getFeed, getFeedPriors, id, metric, now } from '../db';
import { dedupeKey } from '../feeds/normalize';
import { parseFeed } from '../feeds/parse';
import {
	STAGE_1_MODEL,
	STAGE_2_MODEL,
	SUMMARY_PROMPT_VERSION,
	TRIAGE_PROMPT_VERSION,
	Stage2RateLimitError,
	summarizeArticle,
	triageArticle
} from '../ai/pipeline';
import type {
	ArticleSummary,
	ArticleRow,
	FeedRow,
	ParsedEntry,
	PollResult,
	StreamRow,
	TriageResult
} from '../types';

interface RuntimeBindings {
	DB: D1Database;
	AI: Ai;
	BROWSER?: BrowserRun;
}

async function saveTriage(
	db: D1Database,
	article: ArticleRow,
	triage: TriageResult,
	streams: StreamRow[]
) {
	const timestamp = now();
	await db.batch([
		db
			.prepare(
				`INSERT INTO article_analysis (
					article_id, article_type, quality, stage1_model, stage1_prompt_version,
					stage1_result_json, analyzed_at
				) VALUES (?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(article_id) DO UPDATE SET
					article_type = excluded.article_type,
					quality = excluded.quality,
					stage1_model = excluded.stage1_model,
					stage1_prompt_version = excluded.stage1_prompt_version,
					stage1_result_json = excluded.stage1_result_json,
					analyzed_at = excluded.analyzed_at`
			)
			.bind(
				article.id,
				triage.articleType,
				triage.quality,
				STAGE_1_MODEL,
				TRIAGE_PROMPT_VERSION,
				JSON.stringify(triage),
				timestamp
			),
		...triage.streams.map((score) => {
			const stream = streams.find((candidate) => candidate.id === score.streamId);
			return db
				.prepare(
					`INSERT INTO article_streams (article_id, stream_id, relevance, reason, highlighted, created_at)
					 VALUES (?, ?, ?, ?, ?, ?)
					 ON CONFLICT(article_id, stream_id) DO UPDATE SET
					 relevance = excluded.relevance, reason = excluded.reason, highlighted = excluded.highlighted`
				)
				.bind(
					article.id,
					score.streamId,
					score.relevance,
					score.reason,
					score.relevance >= (stream?.highlight_threshold ?? 0.85) ? 1 : 0,
					timestamp
				);
		}),
		db
			.prepare(
				"UPDATE articles SET processing_status = 'triaged', last_processing_error = NULL, updated_at = ? WHERE id = ?"
			)
			.bind(timestamp, article.id)
	]);
}

async function saveSummary(db: D1Database, articleId: string, summary: ArticleSummary) {
	await db.batch([
		db
			.prepare(
				`UPDATE article_analysis SET stage2_model = ?, stage2_prompt_version = ?,
				 summary_json = ?, analyzed_at = ? WHERE article_id = ?`
			)
			.bind(STAGE_2_MODEL, SUMMARY_PROMPT_VERSION, JSON.stringify(summary), now(), articleId),
		db
			.prepare(
				"UPDATE articles SET processing_status = 'summarized', last_processing_error = NULL, updated_at = ? WHERE id = ?"
			)
			.bind(now(), articleId)
	]);
	await metric(db, 'stage2_completed');
}

async function deferSummary(db: D1Database, articleId: string, error: Stage2RateLimitError) {
	await db
		.prepare(
			"UPDATE articles SET processing_status = 'triaged', last_processing_error = ?, updated_at = ? WHERE id = ?"
		)
		.bind(error.message, now(), articleId)
		.run();
	await metric(db, 'stage2_deferred');
}

async function processArticle(env: RuntimeBindings, feed: FeedRow, articleId: string) {
	const { DB: db } = env;
	let article = await getArticle(db, articleId);
	if (!article) return { triaged: false, summarized: false };
	const stableArticleId = article.id;
	let triageSaved = false;
	const timestamp = now();
	await db
		.prepare(
			'UPDATE articles SET processing_attempts = processing_attempts + 1, updated_at = ? WHERE id = ?'
		)
		.bind(timestamp, article.id)
		.run();

	try {
		const acquired = await acquireContent(db, env.BROWSER, feed, article);
		await db
			.prepare(
				`UPDATE articles SET analysis_content = ?, analysis_content_source = ?, content_hash = ?,
				 browser_fetch_status = ?, browser_fetch_error = ?, browser_ms_used = ?,
				 processing_status = 'content_ready', updated_at = ? WHERE id = ?`
			)
			.bind(
				acquired.content,
				acquired.source,
				acquired.hash,
				acquired.browserStatus,
				acquired.browserError,
				acquired.browserMs,
				now(),
				article.id
			)
			.run();

		article = await getArticle(db, article.id);
		if (!article) throw new Error('Article disappeared during processing');
		const streams = await getEnabledStreams(db);
		const priors = await getFeedPriors(db, feed.id);
		const triage = await triageArticle(db, env.AI, article, feed.title, streams, priors);
		await saveTriage(db, article, triage, streams);
		triageSaved = true;
		await metric(db, 'articles_triaged');

		const passesThreshold = triage.streams.some((score) => {
			const stream = streams.find((candidate) => candidate.id === score.streamId);
			return stream ? score.relevance >= stream.relevance_threshold : false;
		});
		if (!triage.summarize || !passesThreshold) return { triaged: true, summarized: false };

		const summary = await summarizeArticle(db, env.AI, article, triage, streams);
		await saveSummary(db, article.id, summary);
		return { triaged: true, summarized: true };
	} catch (error) {
		if (triageSaved && error instanceof Stage2RateLimitError) {
			await deferSummary(db, stableArticleId, error);
			return { triaged: true, summarized: false };
		}
		await db
			.prepare(
				"UPDATE articles SET processing_status = 'failed', last_processing_error = ?, updated_at = ? WHERE id = ?"
			)
			.bind(
				error instanceof Error ? error.message.slice(0, 1500) : 'Unknown processing error',
				now(),
				stableArticleId
			)
			.run();
		return { triaged: false, summarized: false };
	}
}

export async function processPendingSummaries(env: RuntimeBindings, limit = 10) {
	const pending = await all<{ article_id: string; stage1_result_json: string }>(
		env.DB,
		`SELECT aa.article_id, aa.stage1_result_json
		 FROM article_analysis aa
		 JOIN articles a ON a.id = aa.article_id
		 WHERE a.processing_status = 'triaged'
		   AND aa.summary_json IS NULL
		   AND json_extract(aa.stage1_result_json, '$.summarize') = 1
		 ORDER BY a.updated_at
		 LIMIT ?`,
		Math.max(1, Math.min(limit, 25))
	);
	if (!pending.length) return { attempted: 0, completed: 0, deferred: 0, failed: 0 };

	const streams = await getEnabledStreams(env.DB);
	let completed = 0;
	let deferred = 0;
	let failed = 0;
	for (const item of pending) {
		const article = await getArticle(env.DB, item.article_id);
		if (!article) continue;
		try {
			const triage = JSON.parse(item.stage1_result_json) as TriageResult;
			const summary = await summarizeArticle(env.DB, env.AI, article, triage, streams);
			await saveSummary(env.DB, article.id, summary);
			completed += 1;
		} catch (error) {
			if (error instanceof Stage2RateLimitError) {
				await deferSummary(env.DB, article.id, error);
				deferred += 1;
				break;
			}
			await env.DB.prepare(
				"UPDATE articles SET processing_status = 'failed', last_processing_error = ?, updated_at = ? WHERE id = ?"
			)
				.bind(
					error instanceof Error ? error.message.slice(0, 1500) : 'Unknown processing error',
					now(),
					article.id
				)
				.run();
			failed += 1;
		}
	}

	return { attempted: completed + deferred + failed, completed, deferred, failed };
}

function createPollResult(): PollResult {
	return {
		feedsPolled: 0,
		feedsFailed: 0,
		articlesDiscovered: 0,
		articlesDeduplicated: 0,
		articlesTriaged: 0,
		articlesSummarized: 0
	};
}

async function insertAndProcessEntry(
	env: RuntimeBindings,
	feed: FeedRow,
	entry: ParsedEntry,
	key: string,
	result: PollResult
) {
	const articleId = id('article');
	const timestamp = now();
	const inserted = await env.DB.prepare(
		`INSERT OR IGNORE INTO articles (
			 id, feed_id, dedupe_key, guid, url, canonical_url, title, author, published_at,
			 discovered_at, feed_summary, feed_content, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	)
		.bind(
			articleId,
			feed.id,
			key,
			entry.guid,
			entry.url,
			entry.canonicalUrl,
			entry.title,
			entry.author,
			entry.publishedAt,
			timestamp,
			entry.summary,
			entry.content,
			timestamp,
			timestamp
		)
		.run();

	if (!inserted.meta.changes) {
		result.articlesDeduplicated += 1;
		await metric(env.DB, 'articles_deduplicated');
		return;
	}
	result.articlesDiscovered += 1;
	await metric(env.DB, 'articles_discovered');
	const processed = await processArticle(env, feed, articleId);
	if (processed.triaged) result.articlesTriaged += 1;
	if (processed.summarized) result.articlesSummarized += 1;
}

async function updateFeedAfterFetch(feed: FeedRow, response: Response, db: D1Database) {
	const timestamp = now();
	await db
		.prepare(
			`UPDATE feeds SET etag = ?, last_modified = ?, last_polled_at = ?, last_successful_poll_at = ?,
				 last_error = NULL, consecutive_errors = 0, updated_at = ? WHERE id = ?`
		)
		.bind(
			response.headers.get('etag'),
			response.headers.get('last-modified'),
			timestamp,
			timestamp,
			timestamp,
			feed.id
		)
		.run();
}

async function pollFeed(env: RuntimeBindings, feed: FeedRow, result: PollResult) {
	const headers = new Headers({
		accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
		'user-agent': 'Updates/0.1 personal feed reader'
	});
	if (feed.etag) headers.set('if-none-match', feed.etag);
	if (feed.last_modified) headers.set('if-modified-since', feed.last_modified);
	const timestamp = now();
	const response = await fetch(feed.url, { headers, redirect: 'follow' });

	if (response.status === 304) {
		await env.DB.prepare(
			`UPDATE feeds SET last_polled_at = ?, last_successful_poll_at = ?, last_error = NULL,
				 consecutive_errors = 0, updated_at = ? WHERE id = ?`
		)
			.bind(timestamp, timestamp, timestamp, feed.id)
			.run();
		return;
	}
	if (!response.ok) throw new Error(`Feed returned ${response.status} ${response.statusText}`);
	const xml = await response.text();
	const entries = parseFeed(xml, feed.url);

	await updateFeedAfterFetch(feed, response, env.DB);

	for (const entry of entries) {
		const key = await dedupeKey(feed.id, entry);
		const seen = await env.DB.prepare(
			'INSERT OR IGNORE INTO feed_entries (feed_id, dedupe_key, first_seen_at, imported_at) VALUES (?, ?, ?, ?)'
		)
			.bind(feed.id, key, now(), now())
			.run();
		if (!seen.meta.changes) {
			result.articlesDeduplicated += 1;
			await metric(env.DB, 'articles_deduplicated');
			continue;
		}
		await insertAndProcessEntry(env, feed, entry, key, result);
	}
}

export async function pollFeeds(env: RuntimeBindings, onlyFeedId?: string): Promise<PollResult> {
	const result = createPollResult();
	await processPendingSummaries(env);
	const feeds = onlyFeedId
		? await all<FeedRow>(env.DB, 'SELECT * FROM feeds WHERE id = ? AND enabled = 1', onlyFeedId)
		: await all<FeedRow>(env.DB, 'SELECT * FROM feeds WHERE enabled = 1 ORDER BY created_at');

	for (const feed of feeds) {
		result.feedsPolled += 1;
		await metric(env.DB, 'feeds_polled');
		try {
			await pollFeed(env, feed, result);
		} catch (error) {
			result.feedsFailed += 1;
			await metric(env.DB, 'feeds_failed');
			await env.DB.prepare(
				`UPDATE feeds SET last_polled_at = ?, last_error = ?, consecutive_errors = consecutive_errors + 1,
					 updated_at = ? WHERE id = ?`
			)
				.bind(
					now(),
					error instanceof Error ? error.message.slice(0, 1500) : 'Unknown feed error',
					now(),
					feed.id
				)
				.run();
		}
	}
	return result;
}

export async function initializeFeed(
	env: RuntimeBindings,
	feedId: string,
	selectedEntryUrls: string[]
) {
	const feed = await getFeed(env.DB, feedId);
	if (!feed) throw new Error('Feed not found');
	const response = await fetch(feed.url, {
		headers: {
			accept:
				'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
			'user-agent': 'Updates/0.1 personal feed reader'
		},
		redirect: 'follow'
	});
	if (!response.ok) throw new Error(`Feed returned ${response.status} ${response.statusText}`);
	const entries = parseFeed(await response.text(), feed.url);
	await updateFeedAfterFetch(feed, response, env.DB);

	const selected = new Set(selectedEntryUrls.slice(0, 20));
	const prepared = await Promise.all(
		entries.map(async (entry) => ({
			entry,
			key: await dedupeKey(feed.id, entry),
			selected: selected.has(entry.url) || selected.has(entry.canonicalUrl)
		}))
	);
	const timestamp = now();
	for (let index = 0; index < prepared.length; index += 50) {
		await env.DB.batch(
			prepared.slice(index, index + 50).map(({ key, selected: shouldImport }) =>
				env.DB.prepare(
					`INSERT INTO feed_entries (feed_id, dedupe_key, first_seen_at, imported_at)
					 VALUES (?, ?, ?, ?)
					 ON CONFLICT(feed_id, dedupe_key) DO UPDATE SET
					 imported_at = coalesce(feed_entries.imported_at, excluded.imported_at)`
				).bind(feed.id, key, timestamp, shouldImport ? timestamp : null)
			)
		);
	}

	const result = createPollResult();
	result.feedsPolled = 1;
	for (const item of prepared) {
		if (item.selected) await insertAndProcessEntry(env, feed, item.entry, item.key, result);
	}
	return { ...result, entriesAvailable: entries.length, entriesSelected: selected.size };
}

export async function retryArticle(env: RuntimeBindings, articleId: string) {
	const article = await getArticle(env.DB, articleId);
	if (!article) throw new Error('Article not found');
	const feeds = await all<FeedRow>(env.DB, 'SELECT * FROM feeds WHERE id = ?', article.feed_id);
	if (!feeds[0]) throw new Error('Feed not found');
	return processArticle(env, feeds[0], articleId);
}

export async function retryFailedArticles(env: RuntimeBindings, limit = 10) {
	const articles = await all<{ id: string }>(
		env.DB,
		`SELECT id FROM articles
		 WHERE processing_status = 'failed'
		 ORDER BY updated_at
		 LIMIT ?`,
		Math.max(1, Math.min(limit, 10))
	);
	let succeeded = 0;
	for (const article of articles) {
		const result = await retryArticle(env, article.id);
		if (result.triaged) succeeded += 1;
	}
	return { attempted: articles.length, succeeded, failed: articles.length - succeeded };
}
