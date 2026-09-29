import { describe, expect, it } from 'vitest';
import type { ArticleRow, StreamRow } from '../types';
import { createJevTriageInput, validateJevTriage } from './jev';

const article = {
	title: 'Svelte releases a new compiler',
	published_at: '2026-09-29T12:00:00.000Z',
	analysis_content: 'A detailed explanation of the compiler release.'
} as ArticleRow;

const stream = {
	id: 'stream_svelte',
	name: 'Svelte',
	description: 'Svelte framework news',
	relevance_instructions: 'Prefer concrete framework releases and technical analysis.',
	relevance_threshold: 0.65
} as StreamRow;

describe('Jev triage', () => {
	it('builds one typed relevance question per stream', () => {
		const input = createJevTriageInput(
			article,
			'Svelte Blog',
			[stream],
			[{ stream_id: stream.id, prior_weight: 0.2 }]
		);

		expect(input.state.streams).toEqual([
			expect.objectContaining({ id: stream.id, priorWeight: 0.2 })
		]);
		expect(input.questions).toHaveProperty('article_type');
		expect(input.questions).toHaveProperty('quality');
		expect(input.questions).toHaveProperty('stream_0');
	});

	it('normalizes typed answers into the existing triage result', () => {
		const result = validateJevTriage(
			{
				answers: {
					article_type: { type: 'choice', choice: 'release', confidence: 0.95 },
					quality: { type: 'score', score: 3.2, confidence: 0.9 },
					stream_0: { type: 'noul', noul: 0.82 }
				}
			},
			[stream]
		);

		expect(result).toMatchObject({
			articleType: 'release',
			quality: 0.8,
			summarize: true,
			streams: [{ streamId: stream.id, relevance: 0.82 }]
		});
	});

	it('rejects incomplete relevance answers', () => {
		expect(() =>
			validateJevTriage(
				{
					answers: {
						article_type: { type: 'choice', choice: 'release' },
						quality: { type: 'score', score: 3 }
					}
				},
				[stream]
			)
		).toThrow('invalid relevance score');
	});
});
