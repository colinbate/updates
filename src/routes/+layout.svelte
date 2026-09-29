<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#f4f2ec" />
	<meta
		name="description"
		content="Updates is a quiet, intelligent reader for the things worth your attention."
	/>
	<title>Updates</title>
</svelte:head>
{@render children()}
