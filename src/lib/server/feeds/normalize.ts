const TRACKING_PARAMETERS = [
	'utm_source',
	'utm_medium',
	'utm_campaign',
	'utm_term',
	'utm_content',
	'fbclid',
	'gclid'
];

export function decodeEntities(value: string) {
	const entities: Record<string, string> = {
		amp: '&',
		lt: '<',
		gt: '>',
		quot: '"',
		apos: "'",
		nbsp: ' '
	};
	return value
		.replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
			String.fromCodePoint(Number.parseInt(hex, 16))
		)
		.replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number(decimal)))
		.replace(/&([a-z]+);/gi, (match, name: string) => entities[name.toLowerCase()] ?? match);
}

export function normalizeText(value: string | null | undefined, maxLength = 40_000) {
	if (!value) return '';
	return decodeEntities(
		value
			.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
			.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
			.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
			.replace(/<\/?(?:p|div|section|article|h[1-6]|li|blockquote|br)\b[^>]*>/gi, '\n')
			.replace(/<[^>]+>/g, ' ')
	)
		.replace(/\r/g, '')
		.replace(/[ \t]+/g, ' ')
		.replace(/\n[ \t]+/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
		.slice(0, maxLength);
}

export function normalizeUrl(value: string, base?: string) {
	try {
		const url = new URL(value.trim(), base);
		url.hash = '';
		for (const parameter of TRACKING_PARAMETERS) url.searchParams.delete(parameter);
		url.searchParams.sort();
		if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/$/, '');
		return url.toString();
	} catch {
		return value.trim();
	}
}

export function parseDate(value: string | null | undefined) {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function sha256(value: string) {
	const bytes = new TextEncoder().encode(value);
	const hash = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function dedupeKey(
	feedId: string,
	entry: {
		guid: string | null;
		canonicalUrl: string;
		url: string;
		title: string;
		publishedAt: string | null;
	}
) {
	const identity =
		entry.guid?.trim() ||
		entry.canonicalUrl ||
		entry.url ||
		`${entry.title.toLowerCase().trim()}|${entry.publishedAt?.slice(0, 10) ?? ''}`;
	return sha256(`${feedId}|${identity}`);
}
