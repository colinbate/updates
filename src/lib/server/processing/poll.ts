import { acquireContent } from '../content/acquire';
import { all, getArticle, getEnabledStreams, getFeedPriors, id, metric, now } from '../db';
import { dedupeKey } from '../feeds/normalize';
import { parseFeed } from '../feeds/parse';
import {
	STAGE_1_MODEL,
	STAGE_2_MODEL,
	SUMMARY_PROMPT_VERSION,
	TRIAGE_PROMPT_VERSION,
	summarizeArticle,
	triageArticle
} from '../ai/pipeline';
import type { ArticleRow, FeedRow, PollResult, StreamRow, TriageResult } from '../types';

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
			.prepare("UPDATE articles SET processing_status = 'triaged', updated_at = ? WHERE id = ?")
			.bind(timestamp, article.id)
	]);
}

async function processArticle(env: RuntimeBindings, feed: FeedRow, articleId: string) {
	const { DB: db } = env;
	let article = await getArticle(db, articleId);
	if (!article) return { triaged: false, summarized: false };
	const stableArticleId = article.id;
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
		await metric(db, 'articles_triaged');

		const passesThreshold = triage.streams.some((score) => {
			const stream = streams.find((candidate) => candidate.id === score.streamId);
			return stream ? score.relevance >= stream.relevance_threshold : false;
		});
		if (!triage.summarize || !passesThreshold) return { triaged: true, summarized: false };

		const summary = await summarizeArticle(db, env.AI, article, triage, streams);
		await db.batch([
			db
				.prepare(
					`UPDATE article_analysis SET stage2_model = ?, stage2_prompt_version = ?,
					 summary_json = ?, analyzed_at = ? WHERE article_id = ?`
				)
				.bind(STAGE_2_MODEL, SUMMARY_PROMPT_VERSION, JSON.stringify(summary), now(), article.id),
			db
				.prepare(
					"UPDATE articles SET processing_status = 'summarized', updated_at = ? WHERE id = ?"
				)
				.bind(now(), article.id)
		]);
		await metric(db, 'stage2_completed');
		return { triaged: true, summarized: true };
	} catch (error) {
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

	await env.DB.prepare(
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

	for (const entry of entries) {
		const key = await dedupeKey(feed.id, entry);
		const articleId = id('article');
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
				now(),
				entry.summary,
				entry.content,
				now(),
				now()
			)
			.run();

		if (!inserted.meta.changes) {
			result.articlesDeduplicated += 1;
			await metric(env.DB, 'articles_deduplicated');
			continue;
		}
		result.articlesDiscovered += 1;
		await metric(env.DB, 'articles_discovered');
		const processed = await processArticle(env, feed, articleId);
		if (processed.triaged) result.articlesTriaged += 1;
		if (processed.summarized) result.articlesSummarized += 1;
	}
}

export async function pollFeeds(env: RuntimeBindings, onlyFeedId?: string): Promise<PollResult> {
	const result: PollResult = {
		feedsPolled: 0,
		feedsFailed: 0,
		articlesDiscovered: 0,
		articlesDeduplicated: 0,
		articlesTriaged: 0,
		articlesSummarized: 0
	};
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

export async function retryArticle(env: RuntimeBindings, articleId: string) {
	const article = await getArticle(env.DB, articleId);
	if (!article) throw new Error('Article not found');
	const feeds = await all<FeedRow>(env.DB, 'SELECT * FROM feeds WHERE id = ?', article.feed_id);
	if (!feeds[0]) throw new Error('Feed not found');
	return processArticle(env, feeds[0], articleId);
}
