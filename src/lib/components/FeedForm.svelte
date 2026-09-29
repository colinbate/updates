<script lang="ts">
	import type { FeedRow, FeedStreamRow, StreamRow } from '#lib/server/types.js';
	import Button from './Button.svelte';

	let {
		feed,
		prefill,
		streams,
		feedStreams,
		busy,
		onsubmit,
		oncancel
	}: {
		feed: FeedRow | null;
		prefill?: {
			title: string;
			url: string;
			entries?: Array<{ title: string; url: string; publishedAt: string | null }>;
		} | null;
		streams: StreamRow[];
		feedStreams: FeedStreamRow[];
		busy: boolean;
		onsubmit: (event: SubmitEvent) => void;
		oncancel: () => void;
	} = $props();

	function hasStream(streamId: string) {
		return feed
			? feedStreams.some((item) => item.feed_id === feed.id && item.stream_id === streamId)
			: false;
	}

	function entryDate(value: string | null) {
		if (!value) return 'Date unavailable';
		return new Date(value).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	const fieldClass =
		'mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-pink-500';
</script>

<form {onsubmit} class="grid gap-5">
	<input type="hidden" name="id" value={feed?.id ?? ''} />
	{#if prefill?.entries?.length}<input type="hidden" name="initializeFeed" value="1" />{/if}
	<label class="text-sm font-semibold text-stone-700"
		>Display name<input
			class={fieldClass}
			name="title"
			required
			value={feed?.title ?? prefill?.title ?? ''}
			placeholder="Svelte blog"
		/></label
	>
	<label class="text-sm font-semibold text-stone-700"
		>Feed URL<input
			class={fieldClass}
			name="url"
			type="url"
			required
			value={feed?.url ?? prefill?.url ?? ''}
			placeholder="https://example.com/feed.xml"
		/></label
	>
	<label class="text-sm font-semibold text-stone-700"
		>Content policy<select
			class={fieldClass}
			name="contentMode"
			value={feed?.content_mode ?? 'browser_if_thin'}
			><option value="feed_only">Use feed content only</option><option value="browser_if_thin"
				>Use browser when feed is thin</option
			><option value="browser_always">Always retrieve rendered article</option></select
		></label
	>
	<label class="text-sm font-semibold text-stone-700"
		>Thin-content threshold<input
			class={fieldClass}
			name="minimumUsefulContentChars"
			type="number"
			min="0"
			step="100"
			value={feed?.minimum_useful_content_chars ?? 800}
		/></label
	>
	<fieldset class="rounded-xl border border-stone-200 p-4">
		<legend class="px-1 text-sm font-semibold text-stone-700">Stream priors</legend>
		<div class="mt-2 grid gap-2 sm:grid-cols-2">
			{#each streams as stream (stream.id)}<label
					class="flex items-center gap-2 text-sm text-stone-600"
					><input
						class="size-4 accent-pink-500"
						type="checkbox"
						name="streamId"
						value={stream.id}
						checked={hasStream(stream.id)}
					/>{stream.name}</label
				>{/each}
		</div>
	</fieldset>
	{#if prefill?.entries?.length}
		<fieldset class="rounded-xl border border-stone-200 p-4">
			<legend class="px-1 text-sm font-semibold text-stone-700">Import earlier entries</legend>
			<p class="mt-1 text-xs leading-5 text-stone-500">
				Select any existing entries you want analyzed now. Unselected entries are marked as seen,
				and genuinely new entries will be imported automatically on future polls.
			</p>
			<div
				class="mt-3 max-h-64 divide-y divide-stone-200 overflow-y-auto border-y border-stone-200"
			>
				{#each prefill.entries as entry (entry.url)}
					<label class="flex cursor-pointer items-start gap-3 py-3 pr-2 text-sm text-stone-700">
						<input
							class="mt-0.5 size-4 shrink-0 accent-pink-500"
							type="checkbox"
							name="importEntryUrl"
							value={entry.url}
						/>
						<span class="min-w-0"
							><strong class="block leading-5">{entry.title}</strong><small
								class="mt-1 block text-stone-400">{entryDate(entry.publishedAt)}</small
							></span
						>
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}
	<label class="flex items-center gap-2 text-sm font-semibold text-stone-700"
		><input
			class="size-4 accent-pink-500"
			type="checkbox"
			name="enabled"
			checked={feed ? Boolean(feed.enabled) : true}
		/>Poll this feed</label
	>
	<footer class="flex justify-end gap-2 border-t border-stone-200 pt-5">
		<Button type="button" variant="secondary" onclick={oncancel}>Cancel</Button><Button
			disabled={busy}>{busy ? 'Saving…' : 'Save feed'}</Button
		>
	</footer>
</form>
