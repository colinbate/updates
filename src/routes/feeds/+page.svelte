<script lang="ts">
	import { postAction } from '#lib/client/actions.js';
	import Button from '#lib/components/Button.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import FeedForm from '#lib/components/FeedForm.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { relativeDate } from '#lib/display.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let editingId = $state<string | null | undefined>(undefined);
	let busy = $state<string | null>(null);
	let notice = $state<string | null>(null);
	const currentFeed = $derived(data.feeds.find((feed) => feed.id === editingId) ?? null);

	async function run(action: string, form: FormData, busyKey: string) {
		busy = busyKey;
		notice = null;
		try {
			await postAction(action, form);
			if (action === 'save') editingId = undefined;
			notice = action === 'poll' ? 'Feed poll finished.' : 'Saved.';
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Something went wrong';
		} finally {
			busy = null;
		}
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		void run('save', new FormData(event.currentTarget as HTMLFormElement), 'save');
	}

	function feedAction(action: 'poll' | 'delete', id: string) {
		const form = new FormData();
		form.set('id', id);
		void run(action, form, `${action}:${id}`);
	}
</script>

<svelte:head><title>Feeds · Updates</title></svelte:head>
<PageHeader
	title="Feeds"
	description="Control what comes in and how much content each source provides."
	>{#snippet actions()}<Button onclick={() => (editingId = null)}
			><Icon name="plus" />Add feed</Button
		>{/snippet}</PageHeader
>

{#if data.feeds.length}
	<section class="grid gap-3">
		{#each data.feeds as feed (feed.id)}
			<article class="flex items-start gap-4 rounded-xl border border-stone-200 bg-white/70 p-5">
				<div
					class="grid size-11 shrink-0 place-items-center rounded-xl bg-stone-200 font-serif text-lg font-bold text-stone-600"
				>
					{feed.title.slice(0, 1).toUpperCase()}
				</div>
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<h2 class="font-serif text-lg font-semibold">{feed.title}</h2>
						<span
							class={[
								'rounded-full px-2 py-1 text-[10px] font-semibold',
								feed.last_error
									? 'bg-red-100 text-red-700'
									: feed.enabled
										? 'bg-green-100 text-green-700'
										: 'bg-stone-100 text-stone-500'
							]}>{feed.last_error ? 'Needs attention' : feed.enabled ? 'Active' : 'Paused'}</span
						>
					</div>
					<p class="mt-1 truncate text-sm text-stone-500">{feed.url}</p>
					<div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
						<span>{feed.content_mode.replaceAll('_', ' ')}</span><span
							>Last checked {feed.last_polled_at
								? relativeDate(feed.last_polled_at)
								: 'never'}</span
						>{#if feed.last_error}<span class="text-red-700">{feed.last_error}</span>{/if}
					</div>
				</div>
				<div class="flex shrink-0 gap-1">
					<Button
						variant="ghost"
						class="px-2.5"
						title="Poll now"
						disabled={busy === `poll:${feed.id}`}
						onclick={() => feedAction('poll', feed.id)}><Icon name="refresh" /></Button
					><Button variant="ghost" class="px-2.5" title="Edit" onclick={() => (editingId = feed.id)}
						><Icon name="edit" /></Button
					><Button
						variant="danger"
						class="px-2.5"
						title="Delete"
						onclick={() => feedAction('delete', feed.id)}><Icon name="trash" /></Button
					>
				</div>
			</article>
		{/each}
	</section>
{:else}
	<EmptyState
		title="No feeds yet"
		description="Add an RSS or Atom feed to start collecting updates."
		>{#snippet actions()}<Button onclick={() => (editingId = null)}>Add your first feed</Button
			>{/snippet}</EmptyState
	>
{/if}

{#if editingId !== undefined}<Modal
		title={currentFeed ? 'Edit feed' : 'Add feed'}
		close={() => (editingId = undefined)}
		><FeedForm
			feed={currentFeed}
			streams={data.streams}
			feedStreams={data.feedStreams}
			busy={busy === 'save'}
			onsubmit={submit}
			oncancel={() => (editingId = undefined)}
		/></Modal
	>{/if}
{#if notice}<button
		class="fixed right-5 bottom-20 z-50 flex items-center gap-3 rounded-xl bg-stone-900 px-4 py-3 text-sm text-white shadow-xl lg:bottom-5"
		onclick={() => (notice = null)}>{notice}<Icon name="close" /></button
	>{/if}
