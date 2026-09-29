<script lang="ts">
	import Button from './Button.svelte';
	import Icon from './Icon.svelte';
	import Modal from './Modal.svelte';

	let {
		title,
		itemName,
		description,
		confirmLabel = 'Delete',
		busy = false,
		onconfirm,
		oncancel
	}: {
		title: string;
		itemName: string;
		description: string;
		confirmLabel?: string;
		busy?: boolean;
		onconfirm: () => void;
		oncancel: () => void;
	} = $props();
</script>

<Modal {title} close={() => !busy && oncancel()} dialogRole="alertdialog" compact>
	<div class="flex items-start gap-4">
		<span
			class="grid size-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
		>
			<Icon name="warning" class="size-4.5" />
		</span>
		<div class="min-w-0">
			<p class="text-sm leading-6 text-stone-700 dark:text-stone-200">
				Delete <strong>{itemName}</strong>?
			</p>
			<p class="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">{description}</p>
		</div>
	</div>
	<footer class="mt-6 flex justify-end gap-2 border-t border-stone-200 pt-5 dark:border-stone-700">
		<Button autofocus variant="secondary" disabled={busy} onclick={oncancel}>Cancel</Button>
		<Button variant="destructive" disabled={busy} onclick={onconfirm}>
			<Icon name="trash" />{busy ? 'Deleting…' : confirmLabel}
		</Button>
	</footer>
</Modal>
