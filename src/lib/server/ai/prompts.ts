export const TRIAGE_PROMPT_VERSION = 'triage-jev-v1';
export const SUMMARY_PROMPT_VERSION = 'summary-v1';

export const SUMMARY_SYSTEM_PROMPT = `Write a compact, factual decision-oriented summary of an article.
Explain the development and its practical importance; do not merely paraphrase the opening.
Distinguish author opinion from fact. Preserve useful versions, dates, APIs, products, and constraints.
Do not invent implications. Return only schema-conforming JSON.`;
