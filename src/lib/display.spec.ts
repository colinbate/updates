import { afterEach, describe, expect, it, vi } from 'vitest';
import { relativeDate } from './display';

describe('relativeDate', () => {
	afterEach(() => vi.useRealTimers());

	it('includes the year and full month for a previous calendar year', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 8, 29, 12));

		expect(relativeDate(new Date(2025, 5, 30, 12).toISOString())).toBe('June 30, 2025');
	});

	it('keeps the compact date for an earlier date in the current year', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 8, 29, 12));

		expect(relativeDate(new Date(2026, 5, 30, 12).toISOString())).toBe('Jun 30');
	});
});
