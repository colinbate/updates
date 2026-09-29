<script lang="ts">
	import { relativeDate } from '#lib/display.js';
	import type { ArticleListItem, StreamRow } from '#lib/server/types.js';
	import Icon from './Icon.svelte';

	let {
		article,
		streams,
		busy,
		onaction
	}: {
		article: ArticleListItem;
		streams: StreamRow[];
		busy: string | null;
		onaction: (articleId: string, operation: string) => void;
	} = $props();

	const streamMap = $derived(new Map(streams.map((stream) => [stream.id, stream])));
	const highlighted = $derived(article.scores.some((score) => score.highlighted));
	const relevantScores = $derived(
		article.scores.filter((score) => score.relevance >= 0.6).slice(0, 2)
	);
</script>

<article
	class={[
		'overflow-hidden rounded-xl border bg-white/75 shadow-sm dark:bg-stone-900/70',
		highlighted
			? 'border-b-4 border-stone-200 border-b-pink-400 dark:border-stone-700 dark:border-b-pink-500'
			: 'border-stone-200 dark:border-stone-700'
	]}
>
	<div class="grid grid-cols-[2rem_1fr] gap-3 p-5 sm:p-6">
		<span
			class="grid size-8 place-items-center rounded-lg bg-stone-200 font-serif text-xs font-bold text-stone-600"
			>{article.feed_title.slice(0, 1).toUpperCase()}</span
		>
		<div class="min-w-0">
			<div class="mb-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
				<strong class="text-stone-700">{article.feed_title}</strong><span>·</span><time
					>{relativeDate(article.published_at ?? article.discovered_at)}</time
				>
				{#if article.article_type}<span
						class="rounded bg-stone-100 px-2 py-1 text-[10px] font-semibold text-stone-500"
						>{article.article_type}</span
					>{/if}
			</div>
			<h2
				class="max-w-3xl font-serif text-xl leading-tight font-semibold tracking-tight text-stone-900 sm:text-2xl"
			>
				{article.title}
			</h2>
			{#if article.summary}
				<p class="mt-3 max-w-3xl font-serif text-[15px] leading-6 text-stone-600">
					{article.summary.whatHappened}
				</p>
				{#if article.summary.whyItMatters}
					<div class="mt-4 border-l-2 border-pink-300 pl-4 text-sm leading-6 text-stone-600">
						<strong class="text-stone-800">Why it matters:</strong>
						{article.summary.whyItMatters}
					</div>
				{/if}
			{:else if article.processing_status === 'failed'}
				<p class="mt-3 text-sm text-red-700">
					Analysis paused. The original article is still available.
				</p>
			{:else}
				<p class="mt-3 text-sm text-stone-400 italic">Analysis in progress</p>
			{/if}
		</div>
	</div>

	<footer
		class="flex flex-wrap items-center gap-1 border-t border-stone-200 bg-stone-50/60 px-5 py-3 text-xs font-semibold sm:px-6 dark:border-stone-700 dark:bg-stone-950/25"
	>
		<div class="mr-auto flex flex-wrap items-center gap-2">
			<a
				href={article.canonical_url ?? article.url}
				target="_blank"
				rel="noreferrer"
				onclick={() => onaction(article.id, 'read')}
				class="inline-flex items-center gap-1.5 rounded-md py-2 pr-2 text-stone-900 hover:text-pink-700"
				>Read original <Icon name="external" class="size-3.5" /></a
			>
			{#each relevantScores as score (score.streamId)}
				<a
					href={`/streams/${score.streamId}`}
					class="inline-flex items-center gap-2 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-200"
				>
					<span class="size-1.5 rounded-full bg-pink-500"></span>{streamMap.get(score.streamId)
						?.name ?? score.streamId}<span class="text-stone-400"
						>{Math.round(score.relevance * 100)}%</span
					>
				</a>
			{/each}
		</div>
		<button
			disabled={busy === `save:${article.id}`}
			onclick={() => onaction(article.id, 'save')}
			class={[
				'inline-flex items-center gap-1.5 rounded-md px-2 py-2 hover:bg-stone-100 hover:text-pink-700',
				article.saved ? 'text-pink-700' : 'text-stone-500'
			]}><Icon name="saved" class="size-3.5" />{article.saved ? 'Saved' : 'Save'}</button
		>
		<button
			disabled={busy === `dismiss:${article.id}`}
			onclick={() => onaction(article.id, 'dismiss')}
			class="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-stone-500 hover:bg-stone-100 hover:text-pink-700"
			><Icon name="close" class="size-3.5" />Dismiss</button
		>
		{#if article.processing_status === 'failed'}<button
				onclick={() => onaction(article.id, 'retry')}
				class="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-stone-500 hover:bg-stone-100 hover:text-pink-700"
				><Icon name="refresh" class="size-3.5" />Retry</button
			>{/if}
	</footer>
</article>
