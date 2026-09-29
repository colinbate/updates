<script lang="ts">
	import EmptyState from '#lib/components/EmptyState.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head><title>Diagnostics · Updates</title></svelte:head>
<PageHeader
	title="Diagnostics"
	description="A quiet pulse on ingestion, analysis, and resource use."
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
		<span class="text-xs text-stone-500">Highlight candidates</span><strong
			class="mt-2 block font-serif text-3xl">{data.stats.highlights}</strong
		>
	</div>
	<div class="rounded-xl border border-stone-200 bg-white/70 p-5">
		<span class="text-xs text-stone-500">Healthy feeds</span><strong
			class="mt-2 block font-serif text-3xl"
			>{data.stats.feeds - data.stats.unhealthyFeeds}/{data.stats.feeds}</strong
		>
	</div>
</section>

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
