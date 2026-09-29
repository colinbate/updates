import { refreshAll } from '$app/navigation';
import { deserialize } from '$app/forms';

export async function postAction<Success extends Record<string, unknown> = Record<string, unknown>>(
	action: string,
	formData: FormData,
	options: { refresh?: boolean } = {}
) {
	const response = await fetch(`?/${action}`, { method: 'POST', body: formData });
	const result = deserialize<Success, { error?: string }>(await response.text());
	if (!response.ok || result.type === 'failure' || result.type === 'error') {
		const message = result.type === 'failure' ? result.data?.error : undefined;
		throw new Error(message ?? 'The request could not be completed');
	}
	if (options.refresh !== false) await refreshAll();
	return result;
}
