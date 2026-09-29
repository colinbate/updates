import { all, first, id, now } from '../db';
import { formBoolean, formNumber, formText } from '../forms';
import type { StreamRow } from '../types';

export function listStreams(db: D1Database, enabledOnly = false) {
	return all<StreamRow>(
		db,
		`SELECT id, name, description, relevance_instructions, summary_instructions, enabled,
			relevance_threshold, highlight_threshold, created_at, updated_at
		 FROM streams
		 ${enabledOnly ? 'WHERE enabled = 1' : ''}
		 ORDER BY enabled DESC, name`
	);
}

export function getStream(db: D1Database, streamId: string) {
	return first<StreamRow>(
		db,
		`SELECT id, name, description, relevance_instructions, summary_instructions, enabled,
			relevance_threshold, highlight_threshold, created_at, updated_at
		 FROM streams WHERE id = ?`,
		streamId
	);
}

export async function saveStream(db: D1Database, form: FormData) {
	const streamId = formText(form, 'id', false) || id('stream');
	const relevanceThreshold = Math.max(0, Math.min(1, formNumber(form, 'relevanceThreshold', 0.6)));
	const highlightThreshold = Math.max(
		relevanceThreshold,
		Math.min(1, formNumber(form, 'highlightThreshold', 0.85))
	);
	const timestamp = now();

	await db
		.prepare(
			`INSERT INTO streams (
				id, name, description, relevance_instructions, summary_instructions, enabled,
				relevance_threshold, highlight_threshold, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET
				name = excluded.name,
				description = excluded.description,
				relevance_instructions = excluded.relevance_instructions,
				summary_instructions = excluded.summary_instructions,
				enabled = excluded.enabled,
				relevance_threshold = excluded.relevance_threshold,
				highlight_threshold = excluded.highlight_threshold,
				updated_at = excluded.updated_at`
		)
		.bind(
			streamId,
			formText(form, 'name'),
			formText(form, 'description', false),
			formText(form, 'relevanceInstructions'),
			formText(form, 'summaryInstructions', false) || null,
			formBoolean(form, 'enabled') ? 1 : 0,
			relevanceThreshold,
			highlightThreshold,
			timestamp,
			timestamp
		)
		.run();
	return streamId;
}

export function deleteStream(db: D1Database, streamId: string) {
	return db.prepare('DELETE FROM streams WHERE id = ?').bind(streamId).run();
}
