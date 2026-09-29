import { actionError } from '#lib/server/actions/articles.js';
import { STAGE_1_MODEL, STAGE_2_MODEL } from '#lib/server/ai/pipeline.js';
import { retryFailedArticles } from '#lib/server/processing/poll.js';
import { database, runtimeBindings } from '#lib/server/runtime.js';
import {
	getProcessingStats,
	getStats,
	listMetrics,
	listProcessingErrors
} from '#lib/server/services/overview.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const db = database();
	const [stats, processing, processingErrors, metrics] = await Promise.all([
		getStats(db),
		getProcessingStats(db),
		listProcessingErrors(db),
		listMetrics(db)
	]);
	return {
		stats,
		processing,
		processingErrors,
		metrics,
		models: { stage1: STAGE_1_MODEL, stage2: STAGE_2_MODEL }
	};
};

export const actions = {
	retryFailed: async () => {
		try {
			return { success: true, retryResult: await retryFailedArticles(runtimeBindings()) };
		} catch (error) {
			return actionError(error);
		}
	}
} satisfies Actions;
