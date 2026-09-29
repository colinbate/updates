import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';
import { cleanupExpired } from '#lib/server/processing/cleanup.js';
import { pollFeeds } from '#lib/server/processing/poll.js';

export const POST: RequestHandler = async ({ request, url }) => {
	const secret = env.CRON_SECRET;
	if (!secret || request.headers.get('x-updates-cron-secret') !== secret) {
		error(401, 'Unauthorized');
	}
	if (!env.DB) error(503, 'D1 binding is unavailable');

	if (url.searchParams.get('task') === 'cleanup') {
		return Response.json(await cleanupExpired(env.DB));
	}
	if (!env.AI) error(503, 'Workers AI binding is unavailable');
	return Response.json(
		await pollFeeds({
			DB: env.DB,
			AI: env.AI,
			BROWSER: env.BROWSER
		})
	);
};
