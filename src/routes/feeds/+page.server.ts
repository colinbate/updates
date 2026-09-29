import { actionError } from '#lib/server/actions/articles.js';
import { formText } from '#lib/server/forms.js';
import { pollFeeds } from '#lib/server/processing/poll.js';
import { database, runtimeBindings } from '#lib/server/runtime.js';
import { deleteFeed, listFeeds, listFeedStreams, saveFeed } from '#lib/server/services/feeds.js';
import { listStreams } from '#lib/server/services/streams.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const db = database();
	const [feeds, streams, feedStreams] = await Promise.all([
		listFeeds(db),
		listStreams(db),
		listFeedStreams(db)
	]);
	return { feeds, streams, feedStreams };
};

export const actions = {
	save: async ({ request }) => {
		try {
			await saveFeed(database(), await request.formData());
			return { success: true };
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
