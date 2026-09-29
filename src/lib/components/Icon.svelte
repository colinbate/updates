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
		| 'warning'
		| 'globe'
		| 'sun'
		| 'moon'
		| 'arrow';

	let { name, class: className = 'size-4' }: { name: IconName; class?: string } = $props();

	const slabIcons: Partial<Record<IconName, string>> = {
		today: 'calendar',
		highlights: 'star',
		saved: 'bookmark',
		streams: 'list',
		diagnostics: 'sliders',
		plus: 'plus',
		check: 'check',
		close: 'xmark',
		refresh: 'arrows-rotate',
		edit: 'pencil',
		trash: 'trash',
		menu: 'grid',
		warning: 'triangle-exclamation',
		globe: 'globe',
		sun: 'sun',
		moon: 'moon'
	};
	const slabId = $derived(slabIcons[name]);
</script>

{#if slabId}
	<svg viewBox="0 0 576 576" aria-hidden="true" class={className} fill="currentColor">
		<use href={`/icons.svg#${slabId}`}></use>
	</svg>
{:else}
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
		{#if name === 'feeds'}
			<circle cx="6" cy="18" r="1" /><path d="M5 11a8 8 0 0 1 8 8M5 5a14 14 0 0 1 14 14" />
		{:else if name === 'external'}
			<path d="M14 4h6v6M20 4l-9 9M18 13v6H5V6h6" />
		{:else if name === 'arrow'}
			<path d="M5 12h14M14 7l5 5-5 5" />
		{/if}
	</svg>
{/if}
