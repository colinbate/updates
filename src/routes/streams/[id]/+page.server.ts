import { error } from '@sveltejs/kit';
import { createArticleActions } from '#lib/server/actions/articles.js';
import { database } from '#lib/server/runtime.js';
import { listArticles } from '#lib/server/services/articles.js';
import { getStream } from '#lib/server/services/streams.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const db = database();
	const stream = await getStream(db, params.id);
	if (!stream) error(404, 'Stream not found');
	return {
		stream,
		articles: await listArticles(db, 'stream', stream.id)
	};
};

export const actions = createArticleActions() satisfies Actions;
