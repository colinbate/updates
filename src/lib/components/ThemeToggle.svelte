<script lang="ts">
	import Icon from './Icon.svelte';

	function toggleTheme() {
		const root = document.documentElement;
		const dark = !root.classList.contains('dark');
		root.classList.toggle('dark', dark);
		localStorage.setItem('updates-theme', dark ? 'dark' : 'light');
	}
</script>

<button
	type="button"
	class="grid size-9 cursor-pointer place-items-center rounded-lg border border-stone-300 text-stone-500 transition hover:bg-white/60 hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
	onclick={toggleTheme}
	aria-label="Toggle color theme"
	title="Toggle color theme"
>
	<span class="dark:hidden"><Icon name="moon" class="size-4" /></span>
	<span class="hidden dark:inline"><Icon name="sun" class="size-4" /></span>
</button>
