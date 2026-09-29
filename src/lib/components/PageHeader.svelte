<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title, description, actions }: { title: string; description?: string; actions?: Snippet } =
		$props();
</script>

<header class="mb-10 flex max-w-5xl items-end justify-between gap-8">
	<div>
		<h1
			class="font-serif text-4xl leading-none font-medium tracking-tight text-stone-900 sm:text-5xl"
		>
			{title}
		</h1>
		{#if description}
			<p class="mt-3 max-w-2xl font-serif text-base leading-7 text-stone-500">{description}</p>
		{/if}
	</div>
	{#if actions}<div class="shrink-0">{@render actions()}</div>{/if}
</header>
