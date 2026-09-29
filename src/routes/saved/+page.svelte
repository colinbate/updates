<script lang="ts">
	import ArticleListPage from '#lib/components/ArticleListPage.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head><title>Saved · Updates</title></svelte:head>
<ArticleListPage
	title="Saved for later"
	description="The articles you chose to keep, without an expiry date."
	articles={data.articles}
	streams={data.streams}
	feedCount={data.stats.feeds}
	showHighlights={false}
	allowBulkDismiss={false}
/>
