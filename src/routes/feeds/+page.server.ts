import { actionError } from '#lib/server/actions/articles.js';
import { discoverFeeds } from '#lib/server/feeds/discovery.js';
import { formText } from '#lib/server/forms.js';
import { initializeFeed, pollFeeds } from '#lib/server/processing/poll.js';
import { database, runtimeBindings } from '#lib/server/runtime.js';
import { deleteFeed, listFeeds, listFeedStreams, saveFeed } from '#lib/server/services/feeds.js';
import { listStreams } from '#lib/server/services/streams.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const db = database();
	const suggestedUrl = url.searchParams.get('url')?.trim() ?? '';
	const suggestedTitle = url.searchParams.get('title')?.trim() ?? '';
	let initialDiscovery = null;
	let discoveryError = null;
	if (suggestedUrl) {
		try {
			initialDiscovery = await discoverFeeds(suggestedUrl);
		} catch (error) {
			discoveryError = error instanceof Error ? error.message : 'Feed discovery failed';
		}
	}
	const [feeds, streams, feedStreams] = await Promise.all([
		listFeeds(db),
		listStreams(db),
		listFeedStreams(db)
	]);
	return {
		feeds,
		streams,
		feedStreams,
		appOrigin: url.origin,
		suggestedUrl,
		suggestedTitle,
		initialDiscovery,
		discoveryError
	};
};

export const actions = {
	discover: async ({ request }) => {
		try {
			const form = await request.formData();
			return { success: true, discovery: await discoverFeeds(formText(form, 'sourceUrl')) };
		} catch (error) {
			return actionError(error);
		}
	},
	save: async ({ request }) => {
		try {
			const form = await request.formData();
			const feedId = await saveFeed(database(), form);
			const importResult =
				form.get('initializeFeed') === '1'
					? await initializeFeed(
							runtimeBindings(),
							feedId,
							form.getAll('importEntryUrl').map(String)
						)
					: null;
			return { success: true, importResult };
		} catch (error) {
			return actionError(error);
		}
	},
	delete: async ({ request }) => {
		try {
			const form = await request.formData();
			await deleteFeed(database(), formText(form, 'id'));
			return { success: true };
		} catch (error) {
			return actionError(error);
		}
	},
	poll: async ({ request }) => {
		try {
			const form = await request.formData();
			return {
				success: true,
				pollResult: await pollFeeds(runtimeBindings(), formText(form, 'id'))
			};
		} catch (error) {
			return actionError(error);
		}
	}
} satisfies Actions;
