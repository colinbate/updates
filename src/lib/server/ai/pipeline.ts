import { metric } from '../db';
import type { ArticleRow, StreamRow, TriageResult } from '../types';
import { SUMMARY_PROMPT_VERSION, SUMMARY_SYSTEM_PROMPT, TRIAGE_PROMPT_VERSION } from './prompts';
import { createJevTriageInput, validateJevTriage } from './jev';
import { summaryJsonSchema, validateSummary } from './schemas';

export const STAGE_1_MODEL = 'typesafe/jev';
export const STAGE_2_MODEL = 'openai/gpt-6-luna';

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
		await metric(db, 'stage2_failures');
		throw error;
	}
}

export { SUMMARY_PROMPT_VERSION, TRIAGE_PROMPT_VERSION };
