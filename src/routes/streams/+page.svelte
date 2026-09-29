<script lang="ts">
	import { postAction } from '#lib/client/actions.js';
	import Button from '#lib/components/Button.svelte';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import StreamForm from '#lib/components/StreamForm.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let editingId = $state<string | null | undefined>(undefined);
	let busy = $state(false);
	let deletingStream = $state<PageProps['data']['streams'][number] | null>(null);
	let deleting = $state(false);
	let notice = $state<string | null>(null);
	const currentStream = $derived(data.streams.find((stream) => stream.id === editingId) ?? null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		try {
			await postAction('save', new FormData(event.currentTarget as HTMLFormElement));
			editingId = undefined;
			notice = 'Saved.';
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Something went wrong';
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!deletingStream) return;
		const form = new FormData();
		form.set('id', deletingStream.id);
		deleting = true;
		try {
			await postAction('delete', form);
			deletingStream = null;
			notice = 'Stream deleted.';
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Something went wrong';
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head><title>Streams · Updates</title></svelte:head>
<PageHeader
	title="Streams"
	description="Describe what matters. The classifier uses this guidance for every article."
	>{#snippet actions()}<Button onclick={() => (editingId = null)}
			><Icon name="plus" />New stream</Button
		>{/snippet}</PageHeader
>

{#if data.streams.length}
	<section class="grid gap-4 md:grid-cols-2">
		{#each data.streams as stream (stream.id)}
			<article class="rounded-xl border border-stone-200 bg-white/70 p-5">
				<div class="flex items-start justify-between gap-3">
					<a
						href={`/streams/${stream.id}`}
						class="font-serif text-xl font-semibold hover:text-pink-700">{stream.name}</a
					><span
						class={[
							'shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold',
							stream.enabled ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
						]}>{stream.enabled ? 'Enabled' : 'Paused'}</span
					>
				</div>
				<p class="mt-2 min-h-10 text-sm leading-5 text-stone-500">
					{stream.description || 'No description yet.'}
				</p>
				<div class="mt-5 grid grid-cols-2 rounded-lg bg-stone-100 p-3 text-xs text-stone-500">
					<span
						>Relevant <strong class="block pt-1 text-stone-800"
							>{Math.round(stream.relevance_threshold * 100)}%</strong
						></span
					><span
						>Highlight <strong class="block pt-1 text-stone-800"
							>{Math.round(stream.highlight_threshold * 100)}%</strong
						></span
					>
				</div>
				<div class="mt-5 flex items-center gap-2 border-t border-stone-200 pt-4">
					<Button variant="secondary" onclick={() => (editingId = stream.id)}
						><Icon name="edit" />Edit guidance</Button
					><Button
						variant="danger"
						class="ml-auto px-2.5"
						aria-label="Delete stream"
						onclick={() => (deletingStream = stream)}><Icon name="trash" /></Button
					>
				</div>
			</article>
		{/each}
	</section>
{:else}
	<EmptyState
		title="No streams yet"
		description="Create a stream to describe the topics and signals you care about."
		>{#snippet actions()}<Button onclick={() => (editingId = null)}>Create your first stream</Button
			>{/snippet}</EmptyState
	>
{/if}

{#if editingId !== undefined}<Modal
		title={currentStream ? 'Edit stream' : 'New stream'}
		close={() => (editingId = undefined)}
		><StreamForm
			stream={currentStream}
			{busy}
			onsubmit={submit}
			oncancel={() => (editingId = undefined)}
		/></Modal
	>{/if}
{#if deletingStream}<ConfirmDialog
		title="Delete stream?"
		itemName={deletingStream.name}
		description="This removes the stream and its article matches. Existing articles and feeds will remain. This cannot be undone."
		confirmLabel="Delete stream"
		busy={deleting}
		onconfirm={remove}
		oncancel={() => (deletingStream = null)}
	/>{/if}
{#if notice}<button
		class="fixed right-5 bottom-20 z-50 flex items-center gap-3 rounded-xl bg-stone-900 px-4 py-3 text-sm text-white shadow-xl lg:bottom-5"
		onclick={() => (notice = null)}>{notice}<Icon name="close" /></button
	>{/if}
