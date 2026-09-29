<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive';
	type Props = HTMLButtonAttributes & { children: Snippet; variant?: Variant };
	let { children, variant = 'primary', class: className, ...rest }: Props = $props();

	const variants: Record<Variant, string> = {
		primary: 'border-pink-500 bg-pink-500 text-white hover:border-pink-600 hover:bg-pink-600',
		secondary:
			'border-stone-300 bg-white/70 text-stone-700 hover:border-stone-400 hover:bg-white dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-stone-500 dark:hover:bg-stone-700',
		ghost:
			'border-transparent bg-transparent text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100',
		danger:
			'border-transparent bg-transparent text-stone-500 hover:bg-red-50 hover:text-red-700 dark:text-stone-400 dark:hover:bg-red-950/60 dark:hover:text-red-300',
		destructive: 'border-red-700 bg-red-700 text-white hover:border-red-800 hover:bg-red-800'
	};
</script>

<button
	{...rest}
	class={[
		'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50',
		variants[variant],
		className
	]}
>
	{@render children()}
</button>
