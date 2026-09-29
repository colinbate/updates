import { database } from '#lib/server/runtime.js';
import { getStats, listMetrics } from '#lib/server/services/overview.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const db = database();
	const [stats, metrics] = await Promise.all([getStats(db), listMetrics(db)]);
	return { stats, metrics };
};
