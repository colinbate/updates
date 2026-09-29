import { describe, expect, it } from 'vitest';
import { validateSummary } from './schemas';

const summary = {
	whatHappened: 'A new compiler was released.',
	whyItMatters: 'It improves application performance.',
	keyDetails: ['Faster builds', 'Smaller output'],
	worthReadingReason: 'Useful migration details'
};

describe('AI response schemas', () => {
	it('reads a JSON summary from a Workers AI response', () => {
		expect(validateSummary({ response: JSON.stringify(summary) })).toEqual(summary);
	});

	it('reads a JSON summary from an OpenAI-compatible chat completion', () => {
		expect(
			validateSummary({
				choices: [{ message: { role: 'assistant', content: JSON.stringify(summary) } }]
			})
		).toEqual(summary);
	});

	it('reads a summary from a completed Workers AI execution envelope', () => {
		expect(
			validateSummary({
				state: 'Completed',
				result: {
					choices: [{ message: { role: 'assistant', content: JSON.stringify(summary) } }]
				}
			})
		).toEqual(summary);
	});

	it('rejects an incomplete Workers AI execution envelope', () => {
		expect(() => validateSummary({ state: 'Failed', result: null })).toThrow(
			'did not complete (state: Failed)'
		);
	});
});
