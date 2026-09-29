<script lang="ts">
	import { page } from '$app/state';
	import type { AppStats, StreamRow } from '#lib/server/types.js';
	import Icon from './Icon.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	let { streams, stats }: { streams: StreamRow[]; stats: AppStats } = $props();
	const pathname = $derived(page.url.pathname);
	const managementActive = $derived(
		pathname === '/manage' ||
			pathname.startsWith('/feeds') ||
			pathname.startsWith('/streams') ||
			pathname.startsWith('/diagnostics')
	);

	function active(path: string, exact = false) {
		return exact ? pathname === path : pathname.startsWith(path);
	}

	const linkClass =
		'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-white/60 hover:text-stone-900';
</script>

<div
	class="sticky top-0 z-30 border-b border-stone-200 bg-[#f7f5ef]/95 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden"
>
	<header class="flex h-14 items-center justify-between px-5 sm:px-8">
		<a href="/" class="flex items-center gap-2.5 font-serif text-lg font-bold text-stone-900">
			<img src="/favicon.svg" alt="" class="size-7" />
			Updates
		</a>
		<div class="flex items-center gap-2">
			{#if stats.unhealthyFeeds}
				<a
					href="/diagnostics"
					class="flex items-center gap-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700"
				>
					<Icon name="warning" class="size-3.5" />Feed issue
				</a>
			{/if}
			<ThemeToggle />
		</div>
	</header>
	{#if managementActive}
		<nav
			class="grid grid-cols-3 border-t border-stone-200 px-3 py-2 sm:px-6"
			aria-label="Management navigation"
		>
			<a
				href="/feeds"
				class={[
					'flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold',
					active('/feeds') ? 'bg-pink-50 text-pink-700' : 'text-stone-500'
				]}><Icon name="feeds" class="size-4" />Feeds</a
			>
			<a
				href="/streams"
				class={[
					'flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold',
					active('/streams') ? 'bg-pink-50 text-pink-700' : 'text-stone-500'
				]}><Icon name="streams" class="size-4" />Streams</a
			>
			<a
				href="/diagnostics"
				class={[
					'flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold',
					active('/diagnostics') ? 'bg-pink-50 text-pink-700' : 'text-stone-500'
				]}><Icon name="diagnostics" class="size-4" />Diagnostics</a
			>
		</nav>
	{/if}
</div>

<aside
	class="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-stone-300 bg-[#efede6] px-5 py-7 lg:flex"
>
	<a
		href="/"
		class="mb-7 flex items-center gap-3 px-2 font-serif text-2xl font-bold text-stone-900"
	>
		<img src="/favicon.svg" alt="" class="size-8" />
		Updates
	</a>

	<nav class="grid gap-1" aria-label="Primary navigation">
		<a
			href="/"
			class={[
				linkClass,
				active('/', true) ? 'bg-pink-50 font-semibold text-pink-700' : 'text-stone-600'
			]}><Icon name="today" class="size-4.5" />Today</a
		>
		<a
			href="/highlights"
			class={[
				linkClass,
				active('/highlights') ? 'bg-pink-50 font-semibold text-pink-700' : 'text-stone-600'
			]}><Icon name="highlights" class="size-4.5" />Highlights</a
		>
		<a
			href="/saved"
			class={[
				linkClass,
				active('/saved') ? 'bg-pink-50 font-semibold text-pink-700' : 'text-stone-600'
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
						? 'bg-pink-50 font-semibold text-pink-700'
						: 'text-stone-600'
				]}
			>
				<span class="size-2 rounded-full bg-pink-500 ring-4 ring-pink-500/10"></span>{stream.name}
			</a>
		{/each}
	</nav>

	<div class="flex-1"></div>
	<nav class="grid gap-1" aria-label="Management">
		<a
			href="/feeds"
			class={[
				linkClass,
				active('/feeds') ? 'bg-pink-50 font-semibold text-pink-700' : 'text-stone-600'
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
				pathname === '/streams' ? 'bg-pink-50 font-semibold text-pink-700' : 'text-stone-600'
			]}><Icon name="streams" class="size-4.5" />Manage streams</a
		>
		<a
			href="/diagnostics"
			class={[
				linkClass,
				active('/diagnostics') ? 'bg-pink-50 font-semibold text-pink-700' : 'text-stone-600'
			]}><Icon name="diagnostics" class="size-4.5" />Diagnostics</a
		>
	</nav>

	<div class="mt-5 flex items-center gap-3 border-t border-stone-300 px-2 pt-5">
		<span
			class="grid size-8 place-items-center rounded-full bg-pink-500 text-[10px] font-bold text-white"
			>CB</span
		>
		<span class="grid text-xs leading-tight"
			><strong>Personal reader</strong><small class="mt-1 text-stone-500">Private workspace</small
			></span
		>
		<ThemeToggle />
	</div>
</aside>

<nav
	class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-stone-300 bg-[#f7f5ef]/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
	aria-label="Mobile navigation"
>
	<a
		href="/"
		class={[
			'grid place-items-center gap-1 rounded-lg p-2 text-[10px]',
			active('/', true) ? 'text-pink-600' : 'text-stone-500'
		]}><Icon name="today" class="size-5" />Today</a
	>
	<a
		href="/highlights"
		class={[
			'grid place-items-center gap-1 rounded-lg p-2 text-[10px]',
			active('/highlights') ? 'text-pink-600' : 'text-stone-500'
		]}><Icon name="highlights" class="size-5" />Highlights</a
	>
	<a
		href="/saved"
		class={[
			'grid place-items-center gap-1 rounded-lg p-2 text-[10px]',
			active('/saved') ? 'text-pink-600' : 'text-stone-500'
		]}><Icon name="saved" class="size-5" />Saved</a
	>
	<a
		href="/manage"
		class={[
			'grid place-items-center gap-1 rounded-lg p-2 text-[10px]',
			managementActive ? 'text-pink-600' : 'text-stone-500'
		]}><Icon name="menu" class="size-5" />Manage</a
	>
</nav>
