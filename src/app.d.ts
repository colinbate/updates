// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	interface Env {
		CRON_SECRET?: string;
	}

	namespace Cloudflare {
		interface Env {
			CRON_SECRET?: string;
		}
	}
}

export {};
