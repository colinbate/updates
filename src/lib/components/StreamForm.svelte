<script lang="ts">
	import type { StreamRow } from '#lib/server/types.js';
	import Button from './Button.svelte';

	let {
		stream,
		busy,
		onsubmit,
		oncancel
	}: {
		stream: StreamRow | null;
		busy: boolean;
		onsubmit: (event: SubmitEvent) => void;
		oncancel: () => void;
	} = $props();
	const fieldClass =
		'mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-orange-500';
</script>

<form {onsubmit} class="grid gap-5">
	<input type="hidden" name="id" value={stream?.id ?? ''} />
	<label class="text-sm font-semibold text-stone-700"
		>Name<input
			class={fieldClass}
			name="name"
			required
			value={stream?.name ?? ''}
			placeholder="Book club"
		/></label
	>
	<label class="text-sm font-semibold text-stone-700"
		>Description<input
			class={fieldClass}
			name="description"
			value={stream?.description ?? ''}
			placeholder="Books, authors, and ideas worth discussing"
		/></label
	>
	<label class="text-sm font-semibold text-stone-700"
		>Relevance guidance<textarea
			class={fieldClass}
			name="relevanceInstructions"
			required
			rows="7"
			placeholder="Prioritize… Downrank…">{stream?.relevance_instructions ?? ''}</textarea
		></label
	>
	<label class="text-sm font-semibold text-stone-700"
		>Summary guidance <span class="font-normal text-stone-400">(optional)</span><textarea
			class={fieldClass}
			name="summaryInstructions"
			rows="3"
			placeholder="Preserve practical examples and notable claims."
			>{stream?.summary_instructions ?? ''}</textarea
		></label
	>
	<div class="grid gap-4 sm:grid-cols-2">
		<label class="text-sm font-semibold text-stone-700"
			>Relevant at<input
				class={fieldClass}
				name="relevanceThreshold"
				type="number"
				min="0"
				max="1"
				step="0.05"
				value={stream?.relevance_threshold ?? 0.6}
			/></label
		><label class="text-sm font-semibold text-stone-700"
			>Highlight at<input
				class={fieldClass}
				name="highlightThreshold"
				type="number"
				min="0"
				max="1"
				step="0.05"
				value={stream?.highlight_threshold ?? 0.85}
			/></label
		>
	</div>
	<label class="flex items-center gap-2 text-sm font-semibold text-stone-700"
		><input
			class="size-4 accent-orange-700"
			type="checkbox"
			name="enabled"
			checked={stream ? Boolean(stream.enabled) : true}
		/>Enable this stream</label
	>
	<footer class="flex justify-end gap-2 border-t border-stone-200 pt-5">
		<Button type="button" variant="secondary" onclick={oncancel}>Cancel</Button><Button
			disabled={busy}>{busy ? 'Saving…' : 'Save stream'}</Button
		>
	</footer>
</form>
