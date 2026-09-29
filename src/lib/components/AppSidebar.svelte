<script lang="ts">
	import { page } from '$app/state';
	import type { AppStats, StreamRow } from '#lib/server/types.js';
	import Icon from './Icon.svelte';

	let { streams, stats }: { streams: StreamRow[]; stats: AppStats } = $props();
	const pathname = $derived(page.url.pathname);

	function active(path: string, exact = false) {
		return exact ? pathname === path : pathname.startsWith(path);
	}

	const linkClass =
		'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-white/60 hover:text-stone-900';
</script>

<aside
	class="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-stone-300 bg-[#efede6] px-5 py-7 lg:flex"
>
	<a
		href="/"
		class="mb-7 flex items-center gap-3 px-2 font-serif text-2xl font-bold text-stone-900"
	>
		<span
			class="flex size-8 -rotate-3 items-end justify-center gap-0.5 rounded-lg bg-stone-900 p-1.5"
			aria-hidden="true"
		>
			<i class="h-2 w-1 rounded-full bg-stone-100"></i><i class="h-4 w-1 rounded-full bg-stone-100"
			></i><i class="h-3 w-1 rounded-full bg-stone-100"></i>
		</span>
		Updates
	</a>

	<nav class="grid gap-1" aria-label="Primary navigation">
		<a
			href="/"
			class={[
				linkClass,
				active('/', true) ? 'bg-stone-300/70 font-semibold text-stone-900' : 'text-stone-600'
			]}><Icon name="today" class="size-4.5" />Today</a
		>
		<a
			href="/highlights"
			class={[
				linkClass,
				active('/highlights') ? 'bg-stone-300/70 font-semibold text-stone-900' : 'text-stone-600'
			]}><Icon name="highlights" class="size-4.5" />Highlights</a
		>
		<a
			href="/saved"
			class={[
				linkClass,
				active('/saved') ? 'bg-stone-300/70 font-semibold text-stone-900' : 'text-stone-600'
			]}><Icon name="saved" class="size-4.5" />Saved</a
		>
	</nav>

	<div
		class="mt-8 flex items-center justify-between px-3 pb-2 text-xs font-semibold text-stone-500"
	>
		<span>Streams</span><a
			href="/streams"
			class="rounded-md p-1 hover:bg-stone-300"
			aria-label="Manage streams"><Icon name="plus" class="size-3.5" /></a
		>
	</div>
	<nav class="grid gap-1" aria-label="Streams">
		{#each streams as stream (stream.id)}
			<a
				href={`/streams/${stream.id}`}
				class={[
					linkClass,
					pathname === `/streams/${stream.id}`
						? 'bg-stone-300/70 font-semibold text-stone-900'
						: 'text-stone-600'
				]}
			>
				<span class="size-2 rounded-full bg-[#6f7c60] ring-4 ring-[#6f7c60]/10"></span>{stream.name}
			</a>
		{/each}
	</nav>

	<div class="flex-1"></div>
	<nav class="grid gap-1" aria-label="Management">
		<a
			href="/feeds"
			class={[
				linkClass,
				active('/feeds') ? 'bg-stone-300/70 font-semibold text-stone-900' : 'text-stone-600'
			]}
		>
			<Icon name="feeds" class="size-4.5" />Feeds
			{#if stats.unhealthyFeeds}<span
					class="ml-auto size-2 rounded-full bg-red-600"
					title="Some feeds need attention"
				></span>{/if}
		</a>
		<a
			href="/streams"
			class={[
				linkClass,
				pathname === '/streams' ? 'bg-stone-300/70 font-semibold text-stone-900' : 'text-stone-600'
			]}><Icon name="streams" class="size-4.5" />Manage streams</a
		>
		<a
			href="/diagnostics"
			class={[
				linkClass,
				active('/diagnostics') ? 'bg-stone-300/70 font-semibold text-stone-900' : 'text-stone-600'
			]}><Icon name="diagnostics" class="size-4.5" />Diagnostics</a
		>
	</nav>

	<div class="mt-5 flex items-center gap-3 border-t border-stone-300 px-2 pt-5">
		<span
			class="grid size-8 place-items-center rounded-full bg-[#777c67] text-[10px] font-bold text-white"
			>CB</span
		>
		<span class="grid text-xs leading-tight"
			><strong>Personal reader</strong><small class="mt-1 text-stone-500">Private workspace</small
			></span
		>
	</div>
</aside>

<nav
	class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-stone-300 bg-[#f7f5ef]/95 px-2 py-2 backdrop-blur lg:hidden"
	aria-label="Mobile navigation"
>
	<a
		href="/"
		class={[
			'grid place-items-center gap-1 rounded-lg p-2 text-[10px]',
			active('/', true) ? 'text-orange-700' : 'text-stone-500'
		]}><Icon name="today" class="size-5" />Today</a
	>
	<a
		href="/highlights"
		class={[
			'grid place-items-center gap-1 rounded-lg p-2 text-[10px]',
			active('/highlights') ? 'text-orange-700' : 'text-stone-500'
		]}><Icon name="highlights" class="size-5" />Highlights</a
	>
	<a
		href="/saved"
		class={[
			'grid place-items-center gap-1 rounded-lg p-2 text-[10px]',
			active('/saved') ? 'text-orange-700' : 'text-stone-500'
		]}><Icon name="saved" class="size-5" />Saved</a
	>
	<a
		href="/feeds"
		class={[
			'grid place-items-center gap-1 rounded-lg p-2 text-[10px]',
			active('/feeds') || active('/streams') || active('/diagnostics')
				? 'text-orange-700'
				: 'text-stone-500'
		]}><Icon name="menu" class="size-5" />Manage</a
	>
</nav>
