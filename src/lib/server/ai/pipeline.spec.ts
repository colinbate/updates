import { describe, expect, it } from 'vitest';
import { isRateLimitError } from './pipeline';

describe('AI pipeline rate-limit detection', () => {
	it.each([
		'HTTP 429',
		'wholesale rate limit exceeded for this gateway, please reduce request rate or bring your own key',
		'Capacity temporarily exceeded, please try again.',
		new Error('Too many requests')
	])('recognizes a transient capacity error from %s', (error) => {
		expect(isRateLimitError(error)).toBe(true);
	});

	it('does not classify response validation errors as rate limits', () => {
		expect(isRateLimitError(new Error('Stage 2 returned an invalid summary'))).toBe(false);
	});
});
