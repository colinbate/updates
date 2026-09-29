import { createArticleActions } from '#lib/server/actions/articles.js';
import { database } from '#lib/server/runtime.js';
import { listArticles } from '#lib/server/services/articles.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	articles: await listArticles(database(), 'saved')
});

export const actions = createArticleActions() satisfies Actions;
