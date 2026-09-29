import type { ArticleSummary } from '../types';

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

export function workersAiResult(value: unknown) {
	const envelope = object(value);
	if (!envelope || !('state' in envelope) || !('result' in envelope)) return value;

	if (typeof envelope.state !== 'string' || envelope.state.toLowerCase() !== 'completed') {
		throw new Error(
			typeof envelope.state === 'string'
				? `Workers AI request did not complete (state: ${envelope.state})`
				: 'Workers AI returned an invalid execution state'
		);
	}

	return envelope.result;
}

export function resultPayload(value: unknown) {
	const unwrapped = workersAiResult(value);
	const root = object(unwrapped);
	const firstChoice = root && Array.isArray(root.choices) ? object(root.choices[0]) : null;
	const message = object(firstChoice?.message);
	const payload =
		root && 'response' in root
			? root.response
			: message && 'content' in message
				? message.content
				: root && 'output_text' in root
					? root.output_text
					: unwrapped;
	if (typeof payload !== 'string') return payload;
	try {
		return JSON.parse(payload) as unknown;
	} catch {
		return payload;
	}
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
