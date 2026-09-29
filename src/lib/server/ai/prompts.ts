export const TRIAGE_PROMPT_VERSION = 'triage-v1';
export const SUMMARY_PROMPT_VERSION = 'summary-v1';

export const TRIAGE_SYSTEM_PROMPT = `You triage articles for a personal attention-management reader.
Score each enabled stream independently from 0 to 1 using its instructions and any feed prior only as a weak hint.
Prefer concrete, useful material over marketing, repetition, and shallow opinion.
Set summarize true only when at least one stream is genuinely relevant.
Return only schema-conforming JSON.`;

export const SUMMARY_SYSTEM_PROMPT = `Write a compact, factual decision-oriented summary of an article.
Explain the development and its practical importance; do not merely paraphrase the opening.
Distinguish author opinion from fact. Preserve useful versions, dates, APIs, products, and constraints.
Do not invent implications. Return only schema-conforming JSON.`;
