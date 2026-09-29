<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';

	const destinations = [
		{
			href: '/feeds',
			icon: 'feeds' as const,
			title: 'Feeds',
			description: 'Add sources, review their entries, and control how content is retrieved.'
		},
		{
			href: '/streams',
			icon: 'streams' as const,
			title: 'Streams',
			description: 'Describe what matters and tune relevance and highlight thresholds.'
		},
		{
			href: '/diagnostics',
			icon: 'diagnostics' as const,
			title: 'Diagnostics',
			description: 'Check feed retrieval, article analysis, failures, and resource use.'
		}
	];
</script>

<svelte:head><title>Manage · Updates</title></svelte:head>

<PageHeader title="Manage" description="Configure sources, streams, and processing." />

<nav class="grid gap-4 md:grid-cols-3" aria-label="Management areas">
	{#each destinations as destination (destination.href)}
		<a
			href={destination.href}
			class="group rounded-xl border border-stone-200 bg-white/70 p-5 transition hover:border-pink-200 hover:bg-pink-50/40"
		>
			<span class="grid size-11 place-items-center rounded-xl bg-pink-50 text-pink-600">
				<Icon name={destination.icon} class="size-5" />
			</span>
			<strong class="mt-5 block font-serif text-xl text-stone-900 group-hover:text-pink-700">
				{destination.title}
			</strong>
			<p class="mt-2 text-sm leading-6 text-stone-500">{destination.description}</p>
			<span class="mt-5 flex items-center gap-2 text-xs font-semibold text-pink-700">
				Open {destination.title.toLowerCase()}
				<Icon name="arrow" class="size-3.5" />
			</span>
		</a>
	{/each}
</nav>
