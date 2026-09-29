import { metric } from '../db';
import type { ArticleRow, StreamRow, TriageResult } from '../types';
import { SUMMARY_PROMPT_VERSION, SUMMARY_SYSTEM_PROMPT, TRIAGE_PROMPT_VERSION } from './prompts';
import { createJevTriageInput, validateJevTriage } from './jev';
import { summaryJsonSchema, validateSummary } from './schemas';

export const STAGE_1_MODEL = 'typesafe/jev';
export const STAGE_2_MODEL = 'openai/gpt-6-luna';
const STAGE_2_MIN_INTERVAL_MS = 3_500;
const STAGE_2_RETRY_DELAYS_MS = [5_000, 15_000];
const STAGE_2_COOLDOWN_MS = 60_000;

let nextStage2RequestAt = 0;
let stage2CooldownUntil = 0;

export class Stage2RateLimitError extends Error {
	constructor() {
		super('Stage 2 is temporarily rate limited; summary generation will retry on the next poll');
		this.name = 'Stage2RateLimitError';
	}
}

export function isRateLimitError(error: unknown) {
	const message = error instanceof Error ? error.message : String(error);
	return /\b429\b|rate limit|too many requests|capacity temporarily exceeded|wholesale/i.test(
		message
	);
}

function sleep(milliseconds: number) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForStage2Slot() {
	const currentTime = Date.now();
	if (stage2CooldownUntil > currentTime) throw new Stage2RateLimitError();

	const scheduledAt = Math.max(currentTime, nextStage2RequestAt);
	nextStage2RequestAt = scheduledAt + STAGE_2_MIN_INTERVAL_MS;
	if (scheduledAt > currentTime) await sleep(scheduledAt - currentTime);
}

interface Prior {
	stream_id: string;
	prior_weight: number;
}

export async function triageArticle(
	db: D1Database,
	ai: Ai,
	article: ArticleRow,
	feedTitle: string,
	streams: StreamRow[],
	priors: Prior[]
): Promise<TriageResult> {
	await metric(db, 'stage1_requests');

	try {
		const response = await ai.run(
			STAGE_1_MODEL,
			createJevTriageInput(article, feedTitle, streams, priors)
		);
		return validateJevTriage(response, streams);
	} catch (error) {
		await metric(db, 'stage1_failures');
		throw error;
	}
}

export async function summarizeArticle(
	db: D1Database,
	ai: Ai,
	article: ArticleRow,
	triage: TriageResult,
	streams: StreamRow[]
) {
	const relevant = streams.filter((stream) =>
		triage.streams.some(
			(score) => score.streamId === stream.id && score.relevance >= stream.relevance_threshold
		)
	);
	for (let attempt = 0; ; attempt += 1) {
		await waitForStage2Slot();
		await metric(db, 'stage2_requests');
		try {
			const response = await ai.run(STAGE_2_MODEL, {
				messages: [
					{ role: 'system', content: SUMMARY_SYSTEM_PROMPT },
					{
						role: 'user',
						content: JSON.stringify({
							title: article.title,
							publishedAt: article.published_at,
							articleType: triage.articleType,
							content: (article.analysis_content ?? article.title).slice(0, 36_000),
							readerContext: relevant.map((stream) => ({
								stream: stream.name,
								summaryInstructions: stream.summary_instructions
							}))
						})
					}
				],
				response_format: {
					type: 'json_schema',
					json_schema: {
						name: 'article_summary',
						strict: true,
						schema: summaryJsonSchema
					}
				},
				reasoning_effort: 'none',
				temperature: 0.2,
				max_completion_tokens: 1200
			});
			return validateSummary(response);
		} catch (error) {
			if (!isRateLimitError(error)) {
				await metric(db, 'stage2_failures');
				throw error;
			}

			await metric(db, 'stage2_rate_limited');
			const retryDelay = STAGE_2_RETRY_DELAYS_MS[attempt];
			if (retryDelay === undefined) {
				stage2CooldownUntil = Date.now() + STAGE_2_COOLDOWN_MS;
				throw new Stage2RateLimitError();
			}
			await sleep(retryDelay);
		}
	}
}

export { SUMMARY_PROMPT_VERSION, TRIAGE_PROMPT_VERSION };
