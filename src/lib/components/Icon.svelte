<script lang="ts">
	type IconName =
		| 'today'
		| 'highlights'
		| 'saved'
		| 'feeds'
		| 'streams'
		| 'diagnostics'
		| 'plus'
		| 'check'
		| 'close'
		| 'external'
		| 'refresh'
		| 'edit'
		| 'trash'
		| 'menu'
		| 'arrow';

	let { name, class: className = 'size-4' }: { name: IconName; class?: string } = $props();
</script>

<svg
	viewBox="0 0 24 24"
	aria-hidden="true"
	class={className}
	fill="none"
	stroke="currentColor"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
>
	{#if name === 'today'}
		<path d="M4 5h16v15H4zM8 3v4M16 3v4M4 9h16" />
	{:else if name === 'highlights'}
		<path d="m12 3 2.2 5.4L20 10l-5 3.2.3 5.8-3.3-2.3L8.7 19 9 13.2 4 10l5.8-1.6z" />
	{:else if name === 'saved'}
		<path d="M6 3h12v18l-6-4-6 4z" />
	{:else if name === 'feeds'}
		<circle cx="6" cy="18" r="1" /><path d="M5 11a8 8 0 0 1 8 8M5 5a14 14 0 0 1 14 14" />
	{:else if name === 'streams'}
		<path d="M4 7h16M4 12h16M4 17h10" />
	{:else if name === 'diagnostics'}
		<circle cx="12" cy="12" r="3" /><path
			d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"
		/>
	{:else if name === 'plus'}
		<path d="M12 5v14M5 12h14" />
	{:else if name === 'check'}
		<path d="m5 12 4 4L19 6" />
	{:else if name === 'close'}
		<path d="m6 6 12 12M18 6 6 18" />
	{:else if name === 'external'}
		<path d="M14 4h6v6M20 4l-9 9M18 13v6H5V6h6" />
	{:else if name === 'refresh'}
		<path d="M20 7v5h-5M4 17v-5h5M6.1 9a7 7 0 0 1 11.6-2L20 12M4 12l2.3 5a7 7 0 0 0 11.6-2" />
	{:else if name === 'edit'}
		<path d="m4 20 4.5-1 10-10-3.5-3.5-10 10zM13.5 7 17 10.5" />
	{:else if name === 'trash'}
		<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
	{:else if name === 'menu'}
		<path d="M4 7h16M4 12h16M4 17h16" />
	{:else if name === 'arrow'}
		<path d="M5 12h14M14 7l5 5-5 5" />
	{/if}
</svg>
