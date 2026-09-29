export function relativeDate(value: string | null | undefined) {
	if (!value) return 'Recently';
	const date = new Date(value);
	const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
	if (days <= 0) return 'Today';
	if (days === 1) return 'Yesterday';
	if (days < 7) return `${days} days ago`;
	return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function greeting() {
	const hour = new Date().getHours();
	if (hour < 12) return 'Good morning';
	if (hour < 18) return 'Good afternoon';
	return 'Good evening';
}
