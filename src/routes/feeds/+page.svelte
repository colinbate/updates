<script lang="ts">
	import { untrack } from 'svelte';
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
	type Discovery = NonNullable<PageProps['data']['initialDiscovery']>;
	type Candidate = Discovery['feeds'][number];
	type Feed = PageProps['data']['feeds'][number];
	type FeedDraft = {
		title: string;
		url: string;
		entries?: Candidate['entries'];
	};
	const initialCandidate = untrack(() =>
		data.initialDiscovery?.feeds.length === 1 ? data.initialDiscovery.feeds[0] : null
	);
	let sourceUrl = $state(untrack(() => data.suggestedUrl));
	let discovery = $state.raw<Discovery | null>(untrack(() => data.initialDiscovery));
	let discoveryError = $state<string | null>(untrack(() => data.discoveryError));
	let draft = $state<FeedDraft | null>(
		untrack(() =>
			initialCandidate
				? {
						title:
							initialCandidate.title ||
							data.suggestedTitle ||
							data.initialDiscovery?.pageTitle ||
							'',
						url: initialCandidate.url,
						entries: initialCandidate.entries
					}
				: null
		)
	);
	let editingId = $state<string | null | undefined>(initialCandidate ? null : undefined);
	let busy = $state<string | null>(null);
	let notice = $state<string | null>(null);
	const currentFeed = $derived(data.feeds.find((feed) => feed.id === editingId) ?? null);
	const bookmarklet = $derived(
		`javascript:(()=>{const app=${JSON.stringify(`${data.appOrigin}/feeds`)};location.href=app+'?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title)})()`
	);

	async function run(action: string, form: FormData, busyKey: string) {
		busy = busyKey;
		notice = null;
		try {
			await postAction(action, form);
			if (action === 'save') {
				editingId = undefined;
				draft = null;
			}
			notice = action === 'poll' ? 'Feed poll finished.' : 'Saved.';
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Something went wrong';
		} finally {
			busy = null;
		}
	}

	async function discover(event: SubmitEvent) {
		event.preventDefault();
		busy = 'discover';
		discoveryError = null;
		const form = new FormData(event.currentTarget as HTMLFormElement);
		try {
			const result = await postAction<{ success: true; discovery: Discovery }>('discover', form, {
				refresh: false
			});
			if (result.type !== 'success' || !result.data?.discovery) {
				throw new Error('Feed discovery failed');
			}
			const found = result.data.discovery;
			discovery = found;
			if (found.feeds.length === 1) selectCandidate(found.feeds[0]);
		} catch (error) {
			discovery = null;
			discoveryError = error instanceof Error ? error.message : 'Feed discovery failed';
		} finally {
			busy = null;
		}
	}

	function selectCandidate(candidate: Candidate) {
		draft = {
			title: candidate.title || discovery?.pageTitle || data.suggestedTitle || '',
			url: candidate.url,
			entries: candidate.entries
		};
		editingId = null;
	}

	async function reviewEntries(feed: Feed) {
		busy = `review:${feed.id}`;
		notice = null;
		const form = new FormData();
		form.set('sourceUrl', feed.url);
		try {
			const result = await postAction<{ success: true; discovery: Discovery }>('discover', form, {
				refresh: false
			});
			if (result.type !== 'success' || !result.data?.discovery.feeds.length) {
				throw new Error('No entries were found');
			}
			const found = result.data.discovery;
			const candidate = found.feeds.find((item) => item.url === feed.url) ?? found.feeds[0];
			draft = { title: feed.title, url: feed.url, entries: candidate.entries };
			editingId = feed.id;
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Could not load feed entries';
		} finally {
			busy = null;
		}
	}

	function addManually() {
		draft = null;
		editingId = null;
	}

	function editFeed(id: string) {
		draft = null;
		editingId = id;
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
	>{#snippet actions()}<Button onclick={addManually}><Icon name="plus" />Add feed</Button
		>{/snippet}</PageHeader
>

<section class="mb-10 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
	<div class="rounded-xl border border-stone-200 bg-white/70 p-5 sm:p-6">
		<h2 class="font-serif text-xl font-semibold text-stone-900">Find a feed</h2>
		<p class="mt-2 text-sm leading-6 text-stone-500">
			Paste a website, blog, article, RSS, or Atom URL. Updates will inspect the page and verify any
			feeds it finds.
		</p>
		<form class="mt-5 flex flex-col gap-2 sm:flex-row" onsubmit={discover}>
			<input
				class="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-orange-500"
				name="sourceUrl"
				type="text"
				inputmode="url"
				required
				bind:value={sourceUrl}
				placeholder="https://example.com/blog"
			/>
			<Button disabled={busy === 'discover'}
				><Icon name="feeds" />{busy === 'discover' ? 'Looking…' : 'Find feeds'}</Button
			>
		</form>
		{#if discoveryError}<p class="mt-3 text-sm text-red-700">{discoveryError}</p>{/if}
		{#if discovery?.feeds.length}
			<div class="mt-5 grid gap-2">
				{#each discovery.feeds as candidate (candidate.url)}
					<div class="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-3">
						<div class="min-w-0 flex-1">
							<strong class="block truncate text-sm text-stone-800"
								>{candidate.title || discovery.pageTitle || 'Untitled feed'}</strong
							>
							<p class="mt-1 truncate text-xs text-stone-400">{candidate.url}</p>
							<p class="mt-1 text-[11px] text-stone-500">
								{candidate.format} · Found from {candidate.foundBy}
							</p>
						</div>
						<Button variant="secondary" onclick={() => selectCandidate(candidate)}>Use feed</Button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="rounded-xl border border-stone-200 bg-stone-100/70 p-5 sm:p-6">
		<h2 class="font-serif text-xl font-semibold text-stone-900">Add from any page</h2>
		<p class="mt-2 text-sm leading-6 text-stone-500">
			Drag this button to your bookmarks bar. Use it on an article or homepage to open Updates with
			the page ready for discovery.
		</p>
		<a
			href={bookmarklet}
			class="mt-5 inline-flex cursor-grab items-center gap-2 rounded-lg border border-stone-900 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700"
			><Icon name="plus" />Feed to Updates</a
		>
		<p class="mt-3 text-xs leading-5 text-stone-400">
			The bookmarklet sends only the current page URL and title to this Updates installation.
		</p>
	</div>
</section>

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
					<Button
						variant="ghost"
						class="mt-2 px-0 py-1 text-xs"
						disabled={busy === `review:${feed.id}`}
						onclick={() => reviewEntries(feed)}
						><Icon name="feeds" />{busy === `review:${feed.id}`
							? 'Loading entries…'
							: 'Review recent entries'}</Button
					>
				</div>
				<div class="flex shrink-0 gap-1">
					<Button
						variant="ghost"
						class="px-2.5"
						title="Poll now"
						disabled={busy === `poll:${feed.id}`}
						onclick={() => feedAction('poll', feed.id)}><Icon name="refresh" /></Button
					><Button variant="ghost" class="px-2.5" title="Edit" onclick={() => editFeed(feed.id)}
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
		>{#snippet actions()}<Button onclick={addManually}>Add your first feed</Button
			>{/snippet}</EmptyState
	>
{/if}

{#if editingId !== undefined}<Modal
		title={currentFeed ? 'Edit feed' : 'Add feed'}
		close={() => (editingId = undefined)}
		><FeedForm
			feed={currentFeed}
			prefill={draft}
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
