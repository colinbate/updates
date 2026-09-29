import type { ArticleRow, ArticleType, StreamRow, TriageResult } from '../types';

const ARTICLE_TYPE_CRITERIA: Record<ArticleType, string> = {
	news: 'Reporting about a current development or change',
	release: 'A new version, product, publication, or other release',
	tutorial: 'Step-by-step instruction intended to teach a task',
	analysis: 'Detailed examination that develops evidence-based conclusions',
	opinion: 'A primarily subjective argument or personal viewpoint',
	announcement: 'An organization or author formally announcing something',
	discussion: 'A conversation, interview, debate, or community thread',
	reference: 'Material mainly intended to be consulted as documentation or a resource',
	event: 'An event invitation, schedule, recap, or related information',
	sponsored: 'Advertising, promotional, or sponsored material',
	other: 'Content that does not fit any of the other categories'
};

const QUALITY_CRITERIA = [
	'Low value: promotional, repetitive, unsupported, or lacking useful substance',
	'Limited value: contains a small amount of useful information but is shallow or derivative',
	'Solid: useful, concrete, and credible information for an interested reader',
	'High value: unusually informative, practical, original, or well-supported',
	'Exceptional: authoritative or essential material with lasting practical value'
];

interface Prior {
	stream_id: string;
	prior_weight: number;
}

interface JevChoiceAnswer {
	type: 'choice';
	choice: string;
}

interface JevScoreAnswer {
	type: 'score';
	score: number;
}

interface JevNoulAnswer {
	type: 'noul';
	noul: number;
}

function object(value: unknown): Record<string, unknown> | null {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function clamp(value: number) {
	return Math.max(0, Math.min(1, value));
}

export function createJevTriageInput(
	article: ArticleRow,
	feedTitle: string,
	streams: StreamRow[],
	priors: Prior[]
) {
	const streamState = streams.map((stream) => ({
		id: stream.id,
		name: stream.name,
		description: stream.description,
		relevanceInstructions: stream.relevance_instructions,
		priorWeight: priors.find((prior) => prior.stream_id === stream.id)?.prior_weight ?? 0
	}));
	const questions: Record<string, unknown> = {
		article_type: {
			type: 'choice',
			instructions:
				'Choose the single best content type for state.article. Judge the substance, not merely words in the title.',
			criteria: ARTICLE_TYPE_CRITERIA
		},
		quality: {
			type: 'score',
			instructions:
				'Rate the intrinsic quality and usefulness of state.article. Prefer concrete, credible material over marketing, repetition, and shallow opinion.',
			criteria: QUALITY_CRITERIA
		}
	};

	streams.forEach((stream, index) => {
		questions[`stream_${index}`] = {
			type: 'noul',
			instructions: `Is state.article genuinely relevant to state.streams[${index}]? Apply that stream's relevanceInstructions. Treat priorWeight only as a weak hint and judge the article independently.`,
			criteria: {
				true: 'The article substantially matches the stream and would reward the reader’s attention',
				false: 'The match is absent, incidental, too shallow, or mainly promotional'
			}
		};
	});

	return {
		state: {
			feed: feedTitle,
			article: {
				title: article.title,
				publishedAt: article.published_at,
				content: (article.analysis_content ?? article.title).slice(0, 24_000)
			},
			streams: streamState
		},
		questions
	};
}

export function validateJevTriage(value: unknown, streams: StreamRow[]): TriageResult {
	const root = object(value);
	const answers = object(root?.answers);
	const articleTypeAnswer = object(answers?.article_type) as JevChoiceAnswer | null;
	const qualityAnswer = object(answers?.quality) as JevScoreAnswer | null;
	if (
		!answers ||
		articleTypeAnswer?.type !== 'choice' ||
		!(articleTypeAnswer.choice in ARTICLE_TYPE_CRITERIA)
	) {
		throw new Error('Stage 1 returned an invalid article type');
	}
	if (qualityAnswer?.type !== 'score' || !Number.isFinite(qualityAnswer.score)) {
		throw new Error('Stage 1 returned an invalid quality score');
	}

	const scores = streams.map((stream, index) => {
		const answer = object(answers[`stream_${index}`]) as JevNoulAnswer | null;
		if (answer?.type !== 'noul' || !Number.isFinite(answer.noul)) {
			throw new Error(`Stage 1 returned an invalid relevance score for ${stream.name}`);
		}
		return {
			streamId: stream.id,
			relevance: clamp(answer.noul),
			reason: `Jev evaluated this article against the relevance criteria for ${stream.name}.`
		};
	});

	return {
		articleType: articleTypeAnswer.choice as ArticleType,
		quality: clamp(qualityAnswer.score / (QUALITY_CRITERIA.length - 1)),
		streams: scores,
		summarize: scores.some((score) => {
			const stream = streams.find((candidate) => candidate.id === score.streamId);
			return stream ? score.relevance >= stream.relevance_threshold : false;
		})
	};
}
