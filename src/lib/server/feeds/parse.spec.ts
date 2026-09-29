import { describe, expect, it } from 'vitest';
import { normalizeUrl } from './normalize';
import { parseFeed } from './parse';

describe('feed parsing', () => {
	it('normalizes RSS content and tracking URLs', () => {
		const entries = parseFeed(
			`<?xml version="1.0"?><rss version="2.0"><channel><title>Example</title><item>
				<title><![CDATA[ A useful &amp; practical update ]]></title>
				<link>https://example.com/posts/one?utm_source=rss&amp;version=2</link>
				<guid>post-one</guid><pubDate>Mon, 28 Sep 2026 12:00:00 GMT</pubDate>
				<description><![CDATA[<p>Short summary.</p>]]></description>
				<content:encoded><![CDATA[<article><h2>Details</h2><p>Full content.</p></article>]]></content:encoded>
			</item></channel></rss>`,
			'https://example.com/feed.xml'
		);

		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			guid: 'post-one',
			title: 'A useful & practical update',
			url: 'https://example.com/posts/one?version=2',
			summary: 'Short summary.',
			content: 'Details\n\nFull content.'
		});
	});

	it('supports Atom alternate links and authors', () => {
		const entries = parseFeed(
			`<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Release 3</title>
			<id>tag:example.com,2026:release-3</id><link rel="alternate" href="/release-3" />
			<updated>2026-09-29T10:00:00Z</updated><author><name>Ada</name></author>
			<summary>What changed</summary></entry></feed>`,
			'https://example.com/atom.xml'
		);

		expect(entries[0]).toMatchObject({
			title: 'Release 3',
			author: 'Ada',
			url: 'https://example.com/release-3',
			publishedAt: '2026-09-29T10:00:00.000Z'
		});
	});

	it('does not rewrite meaningful query parameters', () => {
		expect(normalizeUrl('https://example.com/story?id=42&utm_campaign=launch')).toBe(
			'https://example.com/story?id=42'
		);
	});
});
