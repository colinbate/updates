<script lang="ts">
	import { greeting } from '#lib/display.js';
	import ArticleListPage from '#lib/components/ArticleListPage.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head><title>Updates</title></svelte:head>
<ArticleListPage
	title={greeting()}
	description={data.articles.length
		? `${data.articles.length} useful ${data.articles.length === 1 ? 'update' : 'updates'} rose above the noise.`
		: 'Nothing needs your attention right now. That is a good thing.'}
	articles={data.articles}
	streams={data.streams}
	feedCount={data.stats.feeds}
/>
