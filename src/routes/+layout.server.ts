import { database } from '#lib/server/runtime.js';
import { getStats } from '#lib/server/services/overview.js';
import { listStreams } from '#lib/server/services/streams.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const db = database();
	const [streams, stats] = await Promise.all([listStreams(db, true), getStats(db)]);
	return { streams, stats };
};
