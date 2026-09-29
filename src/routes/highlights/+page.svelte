<script lang="ts">
	import ArticleListPage from '#lib/components/ArticleListPage.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head><title>Highlights · Updates</title></svelte:head>
<ArticleListPage
	title="Worth your attention"
	description="The highest-signal developments across your streams."
	articles={data.articles}
	streams={data.streams}
	feedCount={data.stats.feeds}
	showHighlights={false}
/>
