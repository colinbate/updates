import { metric } from '../db';
import { normalizeText, sha256 } from '../feeds/normalize';
import type { ArticleRow, FeedRow } from '../types';

export interface AcquiredContent {
	content: string;
	source: ArticleRow['analysis_content_source'];
	browserStatus: ArticleRow['browser_fetch_status'];
	browserError: string | null;
	browserMs: number | null;
	hash: string;
}

function bestFeedContent(article: ArticleRow) {
	if (article.feed_content?.trim()) {
		return { content: normalizeText(article.feed_content), source: 'feed_content' as const };
	}
	if (article.feed_summary?.trim()) {
		return { content: normalizeText(article.feed_summary), source: 'feed_summary' as const };
	}
	return { content: article.title, source: 'none' as const };
}

export async function acquireContent(
	db: D1Database,
	browser: BrowserRun | undefined,
	feed: FeedRow,
	article: ArticleRow
): Promise<AcquiredContent> {
	const fallback = bestFeedContent(article);
	const useBrowser =
		feed.content_mode === 'browser_always' ||
		(feed.content_mode === 'browser_if_thin' &&
			fallback.content.length < feed.minimum_useful_content_chars);

	if (!useBrowser) {
		return {
			...fallback,
			browserStatus: 'skipped',
			browserError: null,
			browserMs: null,
			hash: await sha256(fallback.content)
		};
	}

	if (!browser) {
		return {
			...fallback,
			browserStatus: 'failed',
			browserError: 'Browser Run binding is unavailable',
			browserMs: null,
			hash: await sha256(fallback.content)
		};
	}

	await metric(db, 'browser_requests');
	try {
		const response = await browser.quickAction('markdown', {
			url: article.canonical_url ?? article.url
		});
		const browserMs = Number(response.headers.get('x-browser-ms-used')) || null;
		const payload = (await response.json()) as {
			success?: boolean;
			result?: string;
			errors?: Array<{ message?: string }>;
		};
		if (!response.ok || !payload.success || !payload.result) {
			throw new Error(payload.errors?.[0]?.message ?? `Browser Run returned ${response.status}`);
		}
		const content = normalizeText(payload.result, 80_000);
		if (browserMs) await metric(db, 'browser_ms_used', browserMs);
		return {
			content,
			source: 'browser_markdown',
			browserStatus: 'success',
			browserError: null,
			browserMs,
			hash: await sha256(content)
		};
	} catch (error) {
		await metric(db, 'browser_failures');
		return {
			...fallback,
			browserStatus: 'failed',
			browserError: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown browser error',
			browserMs: null,
			hash: await sha256(fallback.content)
		};
	}
}
