<script lang="ts">
	import ArticleListPage from '#lib/components/ArticleListPage.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.stream.name} · Updates</title></svelte:head>
<ArticleListPage
	title={data.stream.name}
	description={data.stream.description || `Updates matching the ${data.stream.name} stream.`}
	articles={data.articles}
	streams={data.streams}
	feedCount={data.stats.feeds}
/>
