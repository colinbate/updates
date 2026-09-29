import { decodeEntities, normalizeText } from './normalize';
import { parseFeed } from './parse';

const FEED_TYPES = new Set([
	'application/rss+xml',
	'application/atom+xml',
	'application/rdf+xml',
	'application/xml',
	'text/xml'
]);
const COMMON_FEED_NAMES = ['rss.xml', 'feed.xml', 'atom.xml', 'index.xml', 'feed', 'rss', 'atom'];
const MAX_DISCOVERY_BYTES = 1_500_000;
const MAX_FEED_BYTES = 5_000_000;

export interface FeedCandidate {
	url: string;
	title: string;
	format: 'RSS' | 'Atom';
	foundBy: 'page metadata' | 'page link' | 'common address' | 'direct feed';
	entries: FeedEntryPreview[];
}

export interface FeedEntryPreview {
	title: string;
	url: string;
	publishedAt: string | null;
}

export interface FeedDiscoveryResult {
	sourceUrl: string;
	pageTitle: string;
	feeds: FeedCandidate[];
}

interface CandidateHint {
	url: string;
	title: string;
	foundBy: FeedCandidate['foundBy'];
}

function normalizeInputUrl(value: string) {
	const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(value.trim())
		? value.trim()
		: `https://${value.trim()}`;
	const url = new URL(withProtocol);
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('Only HTTP and HTTPS URLs can be checked');
	}
	const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
	if (
		hostname === 'localhost' ||
		hostname.endsWith('.localhost') ||
		hostname === '0.0.0.0' ||
		hostname === '127.0.0.1' ||
		hostname === '::1' ||
		/^10\./.test(hostname) ||
		/^192\.168\./.test(hostname) ||
		/^169\.254\./.test(hostname) ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
	) {
		throw new Error('Private and local network addresses cannot be checked');
	}
	url.hash = '';
	return url;
}

async function responseText(response: Response, limit: number) {
	const declaredLength = Number(response.headers.get('content-length'));
	if (Number.isFinite(declaredLength) && declaredLength > limit) {
		throw new Error('The response is too large to inspect');
	}
	if (!response.body) return '';
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let bytes = 0;
	let text = '';
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		bytes += value.byteLength;
		if (bytes > limit) {
			await reader.cancel();
			throw new Error('The response is too large to inspect');
		}
		text += decoder.decode(value, { stream: true });
	}
	return text + decoder.decode();
}

async function fetchDocument(url: URL, limit: number) {
	const response = await fetch(url, {
		headers: {
			accept:
				'text/html, application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.2',
			'user-agent': 'Updates/0.1 feed discovery'
		},
		redirect: 'follow',
		signal: AbortSignal.timeout(8_000)
	});
	if (!response.ok) throw new Error(`The site returned ${response.status} ${response.statusText}`);
	const finalUrl = normalizeInputUrl(response.url);
	return {
		url: finalUrl,
		contentType: response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '',
		body: await responseText(response, limit)
	};
}

function attributes(source: string) {
	const values = new Map<string, string>();
	for (const match of source.matchAll(
		/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
	)) {
		values.set(match[1].toLowerCase(), decodeEntities(match[2] ?? match[3] ?? match[4] ?? ''));
	}
	return values;
}

function pageTitle(html: string) {
	return normalizeText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1], 300);
}

export function extractFeedLinks(html: string, pageUrl: string): CandidateHint[] {
	const candidates: CandidateHint[] = [];
	for (const match of html.matchAll(/<link\b([^>]*)>/gi)) {
		const attrs = attributes(match[1]);
		const rels = new Set((attrs.get('rel') ?? '').toLowerCase().split(/\s+/));
		const type = (attrs.get('type') ?? '').toLowerCase();
		const href = attrs.get('href');
		if (!href || rels.has('stylesheet')) continue;
		if (!(rels.has('feed') || (rels.has('alternate') && FEED_TYPES.has(type)))) continue;
		try {
			candidates.push({
				url: new URL(href, pageUrl).toString(),
				title: attrs.get('title') ?? '',
				foundBy: 'page metadata'
			});
		} catch {
			// Ignore malformed links and continue looking for usable candidates.
		}
	}

	for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
		const attrs = attributes(match[1]);
		const href = attrs.get('href');
		const label = normalizeText(match[2], 200);
		if (!href || !/(?:rss|atom|feed|subscribe)/i.test(`${href} ${label}`)) continue;
		try {
			candidates.push({
				url: new URL(href, pageUrl).toString(),
				title: label,
				foundBy: 'page link'
			});
		} catch {
			// Ignore malformed links and continue looking for usable candidates.
		}
	}
	return deduplicate(candidates).slice(0, 12);
}

export function commonFeedUrls(pageUrl: string): CandidateHint[] {
	const url = new URL(pageUrl);
	const segments = url.pathname.split('/').filter(Boolean);
	const directories = new Set<string>(['/']);
	for (let length = 1; length <= Math.min(segments.length, 3); length += 1) {
		directories.add(`/${segments.slice(0, length).join('/')}/`);
	}
	return [...directories].flatMap((directory) =>
		COMMON_FEED_NAMES.map((name) => ({
			url: new URL(`${directory}${name}`, url.origin).toString(),
			title: '',
			foundBy: 'common address' as const
		}))
	);
}

function deduplicate(candidates: CandidateHint[]) {
	const seen = new Set<string>();
	return candidates.filter((candidate) => {
		if (seen.has(candidate.url)) return false;
		seen.add(candidate.url);
		return true;
	});
}

function feedFormat(xml: string): FeedCandidate['format'] | null {
	if (/<feed\b/i.test(xml)) return 'Atom';
	if (/<(?:rss|rdf:RDF)\b/i.test(xml)) return 'RSS';
	return null;
}

function feedTitle(xml: string) {
	const channel = xml.match(/<channel\b[^>]*>([\s\S]*?)<\/channel>/i)?.[1] ?? xml;
	return normalizeText(channel.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1], 300);
}

async function validateCandidate(candidate: CandidateHint): Promise<FeedCandidate | null> {
	try {
		const requestedUrl = normalizeInputUrl(candidate.url);
		const document = await fetchDocument(requestedUrl, MAX_FEED_BYTES);
		const format = feedFormat(document.body);
		if (!format) return null;
		const entries = parseFeed(document.body, document.url.toString());
		return {
			url: document.url.toString(),
			title: feedTitle(document.body) || candidate.title,
			format,
			foundBy: candidate.foundBy,
			entries: entries.slice(0, 20).map(({ title, url, publishedAt }) => ({
				title,
				url,
				publishedAt
			}))
		};
	} catch {
		return null;
	}
}

async function validateCandidates(candidates: CandidateHint[]) {
	const results = await Promise.all(candidates.map(validateCandidate));
	const seen = new Set<string>();
	return results.filter((candidate): candidate is FeedCandidate => {
		if (!candidate || seen.has(candidate.url)) return false;
		seen.add(candidate.url);
		return true;
	});
}

export async function discoverFeeds(input: string): Promise<FeedDiscoveryResult> {
	const inputUrl = normalizeInputUrl(input);
	const document = await fetchDocument(inputUrl, MAX_DISCOVERY_BYTES);
	const directFormat = feedFormat(document.body);
	if (directFormat) {
		const entries = parseFeed(document.body, document.url.toString());
		return {
			sourceUrl: document.url.toString(),
			pageTitle: feedTitle(document.body),
			feeds: [
				{
					url: document.url.toString(),
					title: feedTitle(document.body),
					format: directFormat,
					foundBy: 'direct feed',
					entries: entries.slice(0, 20).map(({ title, url, publishedAt }) => ({
						title,
						url,
						publishedAt
					}))
				}
			]
		};
	}

	const title = pageTitle(document.body);
	const linked = await validateCandidates(extractFeedLinks(document.body, document.url.toString()));
	const feeds = linked.length
		? linked
		: await validateCandidates(commonFeedUrls(document.url.toString()).slice(0, 21));
	if (!feeds.length) throw new Error('No valid RSS or Atom feed was found for this page');
	return { sourceUrl: document.url.toString(), pageTitle: title, feeds };
}
