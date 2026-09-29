import { all, id, now } from '../db';
import { formBoolean, formNumber, formText } from '../forms';
import type { ContentMode, FeedRow, FeedStreamRow } from '../types';

export function listFeeds(db: D1Database) {
	return all<FeedRow>(
		db,
		`SELECT id, title, url, enabled, content_mode, minimum_useful_content_chars,
			etag, last_modified, last_polled_at, last_successful_poll_at, last_error,
			consecutive_errors, created_at, updated_at
		 FROM feeds ORDER BY enabled DESC, title`
	);
}

export function listFeedStreams(db: D1Database) {
	return all<FeedStreamRow>(
		db,
		'SELECT feed_id, stream_id, prior_weight FROM feed_streams ORDER BY feed_id, stream_id'
	);
}

export async function saveFeed(db: D1Database, form: FormData) {
	const feedId = formText(form, 'id', false) || id('feed');
	const url = new URL(formText(form, 'url')).toString();
	const contentMode = formText(form, 'contentMode') as ContentMode;
	if (!['feed_only', 'browser_if_thin', 'browser_always'].includes(contentMode)) {
		throw new Error('Invalid content mode');
	}
	const timestamp = now();
	await db
		.prepare(
			`INSERT INTO feeds (
				id, title, url, enabled, content_mode, minimum_useful_content_chars, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET
				title = excluded.title,
				url = excluded.url,
				enabled = excluded.enabled,
				content_mode = excluded.content_mode,
				minimum_useful_content_chars = excluded.minimum_useful_content_chars,
				updated_at = excluded.updated_at`
		)
		.bind(
			feedId,
			formText(form, 'title'),
			url,
			formBoolean(form, 'enabled') ? 1 : 0,
			contentMode,
			Math.max(0, Math.round(formNumber(form, 'minimumUsefulContentChars', 800))),
			timestamp,
			timestamp
		)
		.run();

	const streamIds = new Set(form.getAll('streamId').map(String));
	await db.batch([
		db.prepare('DELETE FROM feed_streams WHERE feed_id = ?').bind(feedId),
		...[...streamIds].map((streamId) =>
			db
				.prepare('INSERT INTO feed_streams (feed_id, stream_id, prior_weight) VALUES (?, ?, ?)')
				.bind(feedId, streamId, 0.15)
		)
	]);
	return feedId;
}

export function deleteFeed(db: D1Database, feedId: string) {
	return db.prepare('DELETE FROM feeds WHERE id = ?').bind(feedId).run();
}
