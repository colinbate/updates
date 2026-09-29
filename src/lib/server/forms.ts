export function formText(form: FormData, key: string, required = true) {
	const value = String(form.get(key) ?? '').trim();
	if (required && !value) throw new Error(`${key} is required`);
	return value;
}

export function formNumber(form: FormData, key: string, fallback: number) {
	const value = Number(form.get(key));
	return Number.isFinite(value) ? value : fallback;
}

export function formBoolean(form: FormData, key: string) {
	return form.get(key) === 'on' || form.get(key) === 'true' || form.get(key) === '1';
}
