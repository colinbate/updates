<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import Icon from './Icon.svelte';
	let {
		title,
		close,
		children,
		dialogRole = 'dialog',
		compact = false
	}: {
		title: string;
		close: () => void;
		children: Snippet;
		dialogRole?: 'dialog' | 'alertdialog';
		compact?: boolean;
	} = $props();
	let dialog: HTMLDivElement | undefined;
	const captureDialog: Attachment<HTMLDivElement> = (element) => {
		dialog = element;
		return () => {
			dialog = undefined;
		};
	};

	function keydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			close();
			return;
		}
		if (event.key !== 'Tab' || !dialog) return;

		const focusable = Array.from(
			dialog.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		);
		if (!focusable.length) return;
		const first = focusable[0];
		const last = focusable.at(-1);
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last?.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}
</script>

<svelte:window onkeydown={keydown} />

<div
	class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-stone-950/35 p-4 backdrop-blur-sm"
	role="presentation"
	onclick={(event) => event.currentTarget === event.target && close()}
>
	<div
		{@attach captureDialog}
		class={[
			'my-8 w-full rounded-2xl border border-stone-200 bg-[#fffef9] dark:bg-stone-950 shadow-2xl',
			compact ? 'max-w-md' : 'max-w-xl'
		]}
		role={dialogRole}
		aria-modal="true"
		aria-label={title}
	>
		<header class="flex items-center justify-between border-b border-stone-200 px-6 py-5">
			<h2 class="font-serif text-2xl font-semibold text-stone-900">{title}</h2>
			<button
				class="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
				onclick={close}
				aria-label="Close"
			>
				<Icon name="close" />
			</button>
		</header>
		<div class="p-6">{@render children()}</div>
	</div>
</div>
