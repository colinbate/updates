<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	let { title, close, children }: { title: string; close: () => void; children: Snippet } =
		$props();
</script>

<div
	class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-stone-950/35 p-4 backdrop-blur-sm"
	role="presentation"
	onclick={(event) => event.currentTarget === event.target && close()}
>
	<div
		class="my-8 w-full max-w-xl rounded-2xl border border-stone-200 bg-[#fffef9] shadow-2xl"
		role="dialog"
		aria-modal="true"
		aria-label={title}
	>
		<header class="flex items-center justify-between border-b border-stone-200 px-6 py-5">
			<h2 class="font-serif text-2xl font-semibold text-stone-900">{title}</h2>
			<button
				class="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
				onclick={close}
				aria-label="Close"
			>
				<Icon name="close" />
			</button>
		</header>
		<div class="p-6">{@render children()}</div>
	</div>
</div>
