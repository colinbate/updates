<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Props = HTMLButtonAttributes & { children: Snippet; variant?: Variant };
	let { children, variant = 'primary', class: className, ...rest }: Props = $props();

	const variants: Record<Variant, string> = {
		primary: 'border-pink-500 bg-pink-500 text-white hover:border-pink-600 hover:bg-pink-600',
		secondary: 'border-stone-300 bg-white/70 text-stone-700 hover:border-stone-400 hover:bg-white',
		ghost:
			'border-transparent bg-transparent text-stone-500 hover:bg-stone-100 hover:text-stone-900',
		danger: 'border-transparent bg-transparent text-stone-500 hover:bg-red-50 hover:text-red-700'
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
