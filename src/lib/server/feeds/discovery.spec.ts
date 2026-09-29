import { describe, expect, it } from 'vitest';
import { commonFeedUrls, extractFeedLinks } from './discovery';

describe('feed discovery', () => {
	it('extracts relative RSS and Atom autodiscovery links', () => {
		const links = extractFeedLinks(
			`<head>
				<link title="News" href="/rss.xml" type="application/rss+xml" rel="alternate">
				<link rel="alternate" type="application/atom+xml" href="feed.atom">
			</head>`,
			'https://example.com/blog/'
		);
		expect(links).toEqual([
			{ url: 'https://example.com/rss.xml', title: 'News', foundBy: 'page metadata' },
			{ url: 'https://example.com/blog/feed.atom', title: '', foundBy: 'page metadata' }
		]);
	});

	it('ignores alternate stylesheets and finds visible feed links', () => {
		const links = extractFeedLinks(
			`<link rel="alternate stylesheet" type="application/rss+xml" href="theme.xml">
			<a href="/updates/feed">Subscribe via RSS</a>`,
			'https://example.com/blog'
		);
		expect(links).toEqual([
			{
				url: 'https://example.com/updates/feed',
				title: 'Subscribe via RSS',
				foundBy: 'page link'
			}
		]);
	});

	it('generates both page-level and site-level conventional addresses', () => {
		const urls = commonFeedUrls('https://svelte.dev/blog').map((candidate) => candidate.url);
		expect(urls).toContain('https://svelte.dev/blog/rss.xml');
		expect(urls).toContain('https://svelte.dev/rss.xml');
	});
});
