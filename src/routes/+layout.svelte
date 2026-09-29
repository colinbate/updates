<script lang="ts">
	import '../routes/layout.css';
	import AppSidebar from '#lib/components/AppSidebar.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<AppSidebar streams={data.streams} stats={data.stats} />
<main class="min-h-screen px-5 pt-7 pb-28 sm:px-8 lg:ml-64 lg:max-w-295 lg:px-16 lg:pt-14">
	{@render children()}
</main>
