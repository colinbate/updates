<script lang="ts">
	import { postAction } from '#lib/client/actions.js';
	import Button from '#lib/components/Button.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { relativeDate } from '#lib/display.js';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	let retrying = $state(false);
	let notice = $state<string | null>(null);

	async function retryFailed() {
		retrying = true;
		notice = null;
		try {
			const result = await postAction<{
				success: true;
				retryResult: { attempted: number; succeeded: number; failed: number };
			}>('retryFailed', new FormData());
			const retryResult = result.type === 'success' ? result.data?.retryResult : null;
			notice = retryResult
				? `Retried ${retryResult.attempted}: ${retryResult.succeeded} succeeded and ${retryResult.failed} failed.`
				: 'Retry finished.';
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Could not retry failed articles.';
		} finally {
			retrying = false;
		}
	}
</script>

<svelte:head><title>Diagnostics · Updates</title></svelte:head>
<PageHeader
	title="Diagnostics"
	description="Feed retrieval and article analysis are tracked separately so a healthy source cannot hide a processing failure."
/>

<section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
	<div class="rounded-xl border border-stone-200 bg-white/70 p-5">
		<span class="text-xs text-stone-500">Retained articles</span><strong
			class="mt-2 block font-serif text-3xl">{data.stats.articles}</strong
		>
	</div>
	<div class="rounded-xl border border-stone-200 bg-white/70 p-5">
		<span class="text-xs text-stone-500">Saved indefinitely</span><strong
			class="mt-2 block font-serif text-3xl">{data.stats.saved}</strong
		>
	</div>
	<div class="rounded-xl border border-stone-200 bg-white/70 p-5">
		<span class="text-xs text-stone-500">Feed retrieval healthy</span><strong
			class="mt-2 block font-serif text-3xl"
			>{data.stats.feeds - data.stats.unhealthyFeeds}/{data.stats.feeds}</strong
		>
	</div>
	<div class="rounded-xl border border-stone-200 bg-white/70 p-5">
		<span class="text-xs text-stone-500">Analysis failures</span><strong
			class="mt-2 block font-serif text-3xl"
			class:text-red-700={data.processing.failed > 0}>{data.processing.failed}</strong
		>
	</div>
</section>

<section class="mt-10 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
	<div class="rounded-xl border border-stone-200 bg-white/70 p-5 sm:p-6">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<h2 class="font-serif text-xl font-semibold text-stone-900">Article analysis</h2>
				<p class="mt-1 text-sm leading-6 text-stone-500">
					Retained means the article was stored. Triage and summary happen afterward through Workers
					AI.
				</p>
			</div>
			{#if data.processing.failed > 0}
				<Button variant="secondary" disabled={retrying} onclick={retryFailed}>
					<Icon name="refresh" />{retrying ? 'Retrying…' : 'Retry next 10'}
				</Button>
			{/if}
		</div>
		<div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div class="rounded-lg bg-stone-100 p-3">
				<span class="block text-xs text-stone-500">Pending</span>
				<strong class="mt-1 block text-xl">{data.processing.pending}</strong>
			</div>
			<div class="rounded-lg bg-stone-100 p-3">
				<span class="block text-xs text-stone-500">Triaged</span>
				<strong class="mt-1 block text-xl">{data.processing.triaged}</strong>
			</div>
			<div class="rounded-lg bg-stone-100 p-3">
				<span class="block text-xs text-stone-500">Summarized</span>
				<strong class="mt-1 block text-xl">{data.processing.summarized}</strong>
			</div>
			<div class="rounded-lg bg-red-50 p-3">
				<span class="block text-xs text-red-600">Failed</span>
				<strong class="mt-1 block text-xl text-red-800">{data.processing.failed}</strong>
			</div>
		</div>
		{#if notice}
			<p class="mt-4 rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">{notice}</p>
		{/if}
	</div>

	<div class="rounded-xl border border-stone-200 bg-stone-100/70 p-5 sm:p-6">
		<h2 class="font-serif text-xl font-semibold text-stone-900">AI configuration</h2>
		<p class="mt-1 text-sm leading-6 text-stone-500">
			The Workers AI binding is configured. These are the models the two analysis stages request.
		</p>
		<dl class="mt-5 space-y-4 text-sm">
			<div>
				<dt class="text-xs text-stone-500">Stage 1 · triage</dt>
				<dd class="mt-1 font-mono text-xs break-all text-stone-800">{data.models.stage1}</dd>
			</div>
			<div>
				<dt class="text-xs text-stone-500">Stage 2 · summary</dt>
				<dd class="mt-1 font-mono text-xs break-all text-stone-800">{data.models.stage2}</dd>
			</div>
		</dl>
	</div>
</section>

{#if data.processingErrors.length}
	<section class="mt-10">
		<div class="mb-4">
			<h2 class="flex items-center gap-2 font-serif text-xl font-semibold">
				<Icon name="warning" class="size-5 text-red-600" />Processing failures
			</h2>
			<p class="mt-1 text-sm text-stone-500">
				Errors are grouped by their exact message so one configuration problem is easy to identify.
			</p>
		</div>
		<div class="overflow-hidden rounded-xl border border-red-200 bg-white/70">
			{#each data.processingErrors as error (error.message)}
				<div class="border-b border-red-100 p-5 last:border-b-0">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<strong class="text-sm text-red-800"
							>{error.occurrences.toLocaleString()}
							{error.occurrences === 1 ? 'article' : 'articles'}</strong
						>
						<span class="text-xs text-stone-500">Last seen {relativeDate(error.latestAt)}</span>
					</div>
					<p class="mt-3 font-mono text-xs leading-5 break-words text-stone-700">{error.message}</p>
				</div>
			{/each}
		</div>
	</section>
{/if}

<section class="mt-10">
	<div class="mb-4">
		<h2 class="font-serif text-xl font-semibold">Recent activity</h2>
		<p class="mt-1 text-xs text-stone-500">Daily counters from the last two weeks</p>
	</div>
	{#if data.metrics.length}
		<div class="overflow-hidden rounded-xl border border-stone-200 bg-white/70">
			{#each data.metrics as metric (`${metric.day}:${metric.metric}`)}
				<div
					class="grid grid-cols-[7rem_1fr_auto] gap-4 border-b border-stone-200 px-5 py-3 text-sm last:border-b-0"
				>
					<time class="text-stone-500">{metric.day}</time><span
						>{metric.metric.replaceAll('_', ' ')}</span
					><strong>{metric.value.toLocaleString()}</strong>
				</div>
			{/each}
		</div>
	{:else}
		<EmptyState
			title="No activity yet"
			description="Metrics will appear after the first feed poll."
		/>
	{/if}
</section>
