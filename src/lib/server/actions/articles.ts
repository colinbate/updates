import { fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { formText } from '../forms';
import { database, runtimeBindings } from '../runtime';
import { dismissArticles, updateArticle } from '../services/articles';
import { retryArticle } from '../processing/poll';

function actionError(error: unknown) {
	return fail(400, {
		error: error instanceof Error ? error.message : 'The request could not be completed'
	});
}

export function createArticleActions() {
	return {
		article: async ({ request }: RequestEvent) => {
			try {
				const form = await request.formData();
				const articleId = formText(form, 'articleId');
				const operation = formText(form, 'operation');
				if (operation === 'retry') {
					await retryArticle(runtimeBindings(), articleId);
				} else if (operation === 'save' || operation === 'dismiss' || operation === 'read') {
					await updateArticle(database(), articleId, operation);
				} else {
					throw new Error('Unknown article operation');
				}
				return { success: true };
			} catch (error) {
				return actionError(error);
			}
		},
		bulkDismiss: async ({ request }: RequestEvent) => {
			try {
				const form = await request.formData();
				await dismissArticles(database(), form.getAll('articleId').map(String).filter(Boolean));
				return { success: true };
			} catch (error) {
				return actionError(error);
			}
		}
	};
}

export { actionError };
