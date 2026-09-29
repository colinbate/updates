import { readFile, writeFile } from 'node:fs/promises';

const workerPath = '.svelte-kit/cloudflare/_worker.js';
const source = await readFile(workerPath, 'utf8');
const marker = 'export default {';

if (!source.includes(marker)) {
	throw new Error(`Could not identify the generated SvelteKit worker in ${workerPath}`);
}

const worker = 'updatesWorker';
const workerSource = source.replace(marker, `const ${worker} = {`);
const bridge = `

// Updates scheduled-event bridge. Domain work remains in the SvelteKit endpoint.
${worker}.scheduled = async (controller, env, ctx) => {
	if (!env.CRON_SECRET) {
		console.error('Updates cron skipped: CRON_SECRET is not configured');
		return;
	}
	const task = controller.cron === '17 3 * * *' ? 'cleanup' : 'poll';
	const request = new Request('https://updates.internal/api/cron?task=' + task, {
		method: 'POST',
		headers: { 'x-updates-cron-secret': env.CRON_SECRET }
	});
	ctx.waitUntil((async () => {
		const response = await ${worker}.fetch(request, env, ctx);
		if (!response.ok) console.error('Updates cron failed', response.status, await response.text());
	})());
};

export default ${worker};
`;

await writeFile(workerPath, workerSource + bridge, 'utf8');
