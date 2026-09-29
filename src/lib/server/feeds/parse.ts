import { normalizeText, normalizeUrl, parseDate } from './normalize';
import type { ParsedEntry } from '../types';

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function blocks(xml: string, tag: string) {
	return [
		...xml.matchAll(
			new RegExp(`<${escapeRegExp(tag)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`, 'gi')
		)
	].map((match) => match[1]);
}

function tag(block: string, names: string[]) {
	for (const name of names) {
		const match = block.match(
			new RegExp(`<${escapeRegExp(name)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(name)}>`, 'i')
		);
		if (match) return match[1].trim();
	}
	return null;
}

function attribute(block: string, tagName: string, attributeName: string, rel?: string) {
	const matches = block.matchAll(
		new RegExp(`<${escapeRegExp(tagName)}\\b([^>]*)\\/?>(?:<\\/${escapeRegExp(tagName)}>)?`, 'gi')
	);
	for (const match of matches) {
		const attrs = match[1];
		if (rel && !new RegExp(`\\brel=["']${escapeRegExp(rel)}["']`, 'i').test(attrs)) continue;
		const value = attrs.match(
			new RegExp(`\\b${escapeRegExp(attributeName)}=["']([^"']+)["']`, 'i')
		);
		if (value) return value[1];
	}
	return null;
}

function entryFromBlock(block: string, feedUrl: string, atom: boolean): ParsedEntry | null {
	const rawUrl = atom
		? (attribute(block, 'link', 'href', 'alternate') ?? attribute(block, 'link', 'href'))
		: tag(block, ['link']);
	const title = normalizeText(tag(block, ['title']), 500);
	if (!rawUrl || !title) return null;
	const url = normalizeUrl(normalizeText(rawUrl, 4000), feedUrl);
	const canonical = atom ? attribute(block, 'link', 'href', 'canonical') : null;
	const authorBlock = tag(block, ['author']);
	const author = normalizeText(
		atom && authorBlock
			? (tag(authorBlock, ['name']) ?? authorBlock)
			: (authorBlock ?? tag(block, ['dc:creator'])),
		500
	);
	const summary = normalizeText(tag(block, atom ? ['summary'] : ['description']), 40_000);
	const content = normalizeText(tag(block, atom ? ['content'] : ['content:encoded']), 80_000);

	return {
		guid: normalizeText(tag(block, atom ? ['id'] : ['guid']), 2000) || null,
		url,
		canonicalUrl: canonical ? normalizeUrl(canonical, feedUrl) : url,
		title,
		author: author || null,
		publishedAt: parseDate(tag(block, atom ? ['published', 'updated'] : ['pubDate', 'dc:date'])),
		summary: summary || null,
		content: content || null
	};
}

export function parseFeed(xml: string, feedUrl: string) {
	if (xml.length > 5_000_000) throw new Error('Feed is larger than the 5 MB safety limit');
	const atom = /<feed\b/i.test(xml);
	const source = blocks(xml, atom ? 'entry' : 'item');
	if (!source.length) throw new Error('No RSS items or Atom entries were found');
	return source
		.map((block) => entryFromBlock(block, feedUrl, atom))
		.filter((entry): entry is ParsedEntry => entry !== null);
}
