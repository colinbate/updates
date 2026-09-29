import { refreshAll } from '$app/navigation';
import { deserialize } from '$app/forms';

export async function postAction(action: string, formData: FormData) {
	const response = await fetch(`?/${action}`, { method: 'POST', body: formData });
	const result = deserialize<Record<string, unknown>, { error?: string }>(await response.text());
	if (!response.ok || result.type === 'failure' || result.type === 'error') {
		const message = result.type === 'failure' ? result.data?.error : undefined;
		throw new Error(message ?? 'The request could not be completed');
	}
	await refreshAll();
	return result;
}
