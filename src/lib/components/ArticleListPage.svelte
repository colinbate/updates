<script lang="ts">
	import { postAction } from '#lib/client/actions.js';
	import type { ArticleListItem, StreamRow } from '#lib/server/types.js';
	import ArticleCard from './ArticleCard.svelte';
	import Button from './Button.svelte';
	import EmptyState from './EmptyState.svelte';
	import Icon from './Icon.svelte';
	import PageHeader from './PageHeader.svelte';

	let {
		title,
		description,
		articles,
		streams,
		feedCount,
		showHighlights = true,
		allowBulkDismiss = true
	}: {
		title: string;
		description: string;
		articles: ArticleListItem[];
		streams: StreamRow[];
		feedCount: number;
		showHighlights?: boolean;
		allowBulkDismiss?: boolean;
	} = $props();

	let busy = $state<string | null>(null);
	let notice = $state<string | null>(null);
	const highlighted = $derived(
		showHighlights
			? articles.filter((article) => article.scores.some((score) => score.highlighted))
			: []
	);
	const recent = $derived(
		showHighlights ? articles.filter((article) => !highlighted.includes(article)) : articles
	);

	async function run(action: string, form: FormData, busyKey: string) {
		busy = busyKey;
		notice = null;
		try {
			await postAction(action, form);
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Something went wrong';
		} finally {
			busy = null;
		}
	}

	function articleAction(articleId: string, operation: string) {
		const form = new FormData();
		form.set('articleId', articleId);
		form.set('operation', operation);
		void run('article', form, `${operation}:${articleId}`);
	}

	function bulkDismiss() {
		const form = new FormData();
		for (const article of articles) form.append('articleId', article.id);
		void run('bulkDismiss', form, 'bulkDismiss');
	}
</script>

<PageHeader {title} {description}>
	{#snippet actions()}
		{#if allowBulkDismiss && articles.length}
			<Button variant="secondary" onclick={bulkDismiss} disabled={busy === 'bulkDismiss'}
				><Icon name="check" />Caught up enough</Button
			>
		{/if}
	{/snippet}
</PageHeader>

{#if highlighted.length}
	<section class="mb-10">
		<div class="mb-4 flex items-end justify-between">
			<div>
				<h2 class="font-serif text-xl font-semibold">Worth your attention</h2>
				<p class="mt-1 text-xs text-stone-500">High-signal developments selected for you</p>
			</div>
			<span
				class="grid size-7 place-items-center rounded-full border border-stone-300 text-xs text-stone-500"
				>{highlighted.length}</span
			>
		</div>
		<div class="grid gap-3">
			{#each highlighted as article (article.id)}<ArticleCard
					{article}
					{streams}
					hero
					{busy}
					onaction={articleAction}
				/>{/each}
		</div>
	</section>
{/if}

<section>
	{#if highlighted.length}<div class="mb-4 flex items-end justify-between">
			<div>
				<h2 class="font-serif text-xl font-semibold">Also relevant</h2>
				<p class="mt-1 text-xs text-stone-500">Useful updates, ordered by recency</p>
			</div>
			{#if recent.length}<span
					class="grid size-7 place-items-center rounded-full border border-stone-300 text-xs text-stone-500"
					>{recent.length}</span
				>{/if}
		</div>{/if}
	{#if recent.length}
		<div class="grid gap-3">
			{#each recent as article (article.id)}<ArticleCard
					{article}
					{streams}
					{busy}
					onaction={articleAction}
				/>{/each}
		</div>
	{:else if !highlighted.length}
		<EmptyState
			title="All quiet here"
			description="Add a feed or adjust your stream guidance, then let Updates do the sorting."
		>
			{#snippet actions()}{#if !feedCount}<a
						href="/feeds"
						class="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700"
						>Add a feed <Icon name="arrow" /></a
					>{/if}{/snippet}
		</EmptyState>
	{/if}
</section>

{#if notice}<button
		class="fixed right-5 bottom-20 z-50 flex items-center gap-3 rounded-xl bg-stone-900 px-4 py-3 text-sm text-white shadow-xl lg:bottom-5"
		onclick={() => (notice = null)}>{notice}<Icon name="close" /></button
	>{/if}
