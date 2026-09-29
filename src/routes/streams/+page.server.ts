import { actionError } from '#lib/server/actions/articles.js';
import { formText } from '#lib/server/forms.js';
import { database } from '#lib/server/runtime.js';
import { deleteStream, listStreams, saveStream } from '#lib/server/services/streams.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ streams: await listStreams(database()) });

export const actions = {
	save: async ({ request }) => {
		try {
			await saveStream(database(), await request.formData());
			return { success: true };
		} catch (error) {
			return actionError(error);
		}
	},
	delete: async ({ request }) => {
		try {
			const form = await request.formData();
			await deleteStream(database(), formText(form, 'id'));
			return { success: true };
		} catch (error) {
			return actionError(error);
		}
	}
} satisfies Actions;
