import type { ArticleSummary, ArticleType, TriageResult } from '../types';

const ARTICLE_TYPES: ArticleType[] = [
	'news',
	'release',
	'tutorial',
	'analysis',
	'opinion',
	'announcement',
	'discussion',
	'reference',
	'event',
	'sponsored',
	'other'
];

export const triageJsonSchema = {
	type: 'object',
	properties: {
		articleType: { type: 'string', enum: ARTICLE_TYPES },
		quality: { type: 'number', minimum: 0, maximum: 1 },
		streams: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					streamId: { type: 'string' },
					relevance: { type: 'number', minimum: 0, maximum: 1 },
					reason: { type: 'string' }
				},
				required: ['streamId', 'relevance', 'reason'],
				additionalProperties: false
			}
		},
		summarize: { type: 'boolean' }
	},
	required: ['articleType', 'quality', 'streams', 'summarize'],
	additionalProperties: false
};

export const summaryJsonSchema = {
	type: 'object',
	properties: {
		whatHappened: { type: 'string' },
		whyItMatters: { type: ['string', 'null'] },
		keyDetails: { type: 'array', items: { type: 'string' }, maxItems: 5 },
		worthReadingReason: { type: ['string', 'null'] }
	},
	required: ['whatHappened', 'whyItMatters', 'keyDetails', 'worthReadingReason'],
	additionalProperties: false
};

function object(value: unknown): Record<string, unknown> | null {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

export function resultPayload(value: unknown) {
	const root = object(value);
	return root && 'response' in root ? root.response : value;
}

export function validateTriage(value: unknown, allowedStreams: Set<string>): TriageResult {
	const data = object(resultPayload(value));
	if (!data || !ARTICLE_TYPES.includes(data.articleType as ArticleType)) {
		throw new Error('Stage 1 returned an invalid article type');
	}
	if (typeof data.quality !== 'number' || !Array.isArray(data.streams)) {
		throw new Error('Stage 1 returned an invalid score payload');
	}
	const streams = data.streams.map((item) => {
		const row = object(item);
		if (
			!row ||
			typeof row.streamId !== 'string' ||
			!allowedStreams.has(row.streamId) ||
			typeof row.relevance !== 'number' ||
			typeof row.reason !== 'string'
		) {
			throw new Error('Stage 1 returned an invalid stream score');
		}
		return {
			streamId: row.streamId,
			relevance: Math.max(0, Math.min(1, row.relevance)),
			reason: row.reason.slice(0, 500)
		};
	});
	return {
		articleType: data.articleType as ArticleType,
		quality: Math.max(0, Math.min(1, data.quality)),
		streams,
		summarize: data.summarize === true
	};
}

export function validateSummary(value: unknown): ArticleSummary {
	const data = object(resultPayload(value));
	if (!data || typeof data.whatHappened !== 'string' || !Array.isArray(data.keyDetails)) {
		throw new Error('Stage 2 returned an invalid summary');
	}
	return {
		whatHappened: data.whatHappened.slice(0, 1500),
		whyItMatters: typeof data.whyItMatters === 'string' ? data.whyItMatters.slice(0, 1000) : null,
		keyDetails: data.keyDetails
			.filter((item): item is string => typeof item === 'string')
			.slice(0, 5),
		worthReadingReason:
			typeof data.worthReadingReason === 'string' ? data.worthReadingReason.slice(0, 1000) : null
	};
}
