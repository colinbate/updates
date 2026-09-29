import { metric } from '../db';
import type { ArticleRow, StreamRow, TriageResult } from '../types';
import {
	SUMMARY_PROMPT_VERSION,
	SUMMARY_SYSTEM_PROMPT,
	TRIAGE_PROMPT_VERSION,
	TRIAGE_SYSTEM_PROMPT
} from './prompts';
import { summaryJsonSchema, triageJsonSchema, validateSummary, validateTriage } from './schemas';

export const STAGE_1_MODEL = '@cf/meta/llama-3.1-8b-instruct';
export const STAGE_2_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

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
	const prompt = JSON.stringify({
		feed: feedTitle,
		article: {
			title: article.title,
			publishedAt: article.published_at,
			content: (article.analysis_content ?? article.title).slice(0, 24_000)
		},
		streams: streams.map((stream) => ({
			id: stream.id,
			name: stream.name,
			description: stream.description,
			instructions: stream.relevance_instructions,
			priorWeight: priors.find((prior) => prior.stream_id === stream.id)?.prior_weight ?? 0
		}))
	});

	try {
		const response = await ai.run(STAGE_1_MODEL, {
			messages: [
				{ role: 'system', content: TRIAGE_SYSTEM_PROMPT },
				{ role: 'user', content: prompt }
			],
			response_format: { type: 'json_schema', json_schema: triageJsonSchema },
			temperature: 0.1,
			max_tokens: 1400
		});
		return validateTriage(response, new Set(streams.map((stream) => stream.id)));
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
	await metric(db, 'stage2_requests');
	const relevant = streams.filter((stream) =>
		triage.streams.some(
			(score) => score.streamId === stream.id && score.relevance >= stream.relevance_threshold
		)
	);
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
			response_format: { type: 'json_schema', json_schema: summaryJsonSchema },
			temperature: 0.2,
			max_tokens: 1200
		});
		return validateSummary(response);
	} catch (error) {
		await metric(db, 'stage2_failures');
		throw error;
	}
}

export { SUMMARY_PROMPT_VERSION, TRIAGE_PROMPT_VERSION };
