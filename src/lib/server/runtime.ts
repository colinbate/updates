import { env } from 'cloudflare:workers';

export function database() {
	return env.DB;
}

export function runtimeBindings() {
	return { DB: env.DB, AI: env.AI, BROWSER: env.BROWSER };
}
