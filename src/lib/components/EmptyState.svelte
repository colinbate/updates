<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title, description, actions }: { title: string; description: string; actions?: Snippet } =
		$props();
</script>

<div
	class="rounded-2xl border border-dashed border-stone-300 bg-white/50 px-6 py-16 text-center dark:border-stone-700 dark:bg-stone-900/60"
>
	<div
		class="mx-auto mb-5 size-10 rounded-full border border-stone-300 bg-stone-100 shadow-[0_0_0_8px_rgba(231,229,228,.4)] dark:border-stone-600 dark:bg-stone-700 dark:shadow-[0_0_0_8px_rgba(87,83,78,.35)]"
	></div>
	<h2 class="font-serif text-xl font-semibold text-stone-900 dark:text-stone-50">{title}</h2>
	<p class="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500 dark:text-stone-300">
		{description}
	</p>
	{#if actions}<div class="mt-6">{@render actions()}</div>{/if}
</div>
