# Updates

Updates is a single-user RSS/Atom intelligence reader built with SvelteKit 3 and Cloudflare. It polls feeds, acquires useful article content, classifies each article against personal streams, summarizes only relevant material, and expires low-value history automatically.

## MVP capabilities

- RSS and Atom parsing with conditional HTTP requests, safe URL normalization, and deduplication
- Per-feed `feed_only`, `browser_if_thin`, and `browser_always` content policies
- Cloudflare Browser Run Markdown extraction with graceful feed-content fallback
- Two-stage Workers AI pipeline with JSON-schema output and explicit prompt/model provenance
- Multiple stream scores per article, thresholds, highlights, save/dismiss/read actions, and bulk dismissal
- Feed and stream management, manual feed polling, failed-article retries, and daily diagnostics
- Hourly polling, daily cleanup, and saved-article retention
- Responsive desktop and mobile reader UI

## Cloudflare setup

1. Create a D1 database named `updates-db` and replace the placeholder `database_id` in `wrangler.jsonc` with the returned ID.
2. Apply the database migration:

   ```sh
   pnpm db:migrate:local
   pnpm db:migrate:remote
   ```

3. Set a strong internal cron secret:

   ```sh
   pnpm wrangler secret put CRON_SECRET
   ```

4. Protect the deployed application with Cloudflare Access. The application is intentionally single-user and does not implement a second identity system.

The Worker has D1 (`DB`), Workers AI (`AI`), and Browser Run (`BROWSER`) bindings. Browser Run is remote during local Wrangler development because Quick Actions are not locally emulated. Cron triggers run hourly at minute 7 and cleanup daily at 03:17 UTC.

The official SvelteKit Cloudflare adapter currently generates only a fetch handler. `scripts/append-cron.mjs` wraps that generated default export after each build and adds the scheduled-event bridge; all domain work still runs through the secret-protected SvelteKit cron endpoint.

## Commands

```sh
pnpm check                 # Svelte and TypeScript diagnostics
pnpm lint                  # Prettier and ESLint
pnpm test                  # unit and browser-component tests
pnpm build                 # production Cloudflare build plus cron bridge
pnpm preview               # Wrangler preview (starts a local server)
```

## Application structure

- `src/routes` contains URL-backed screens and thin server load/action modules.
- `src/lib/components` contains shared Tailwind-based interface components.
- `src/lib/server/services` owns application queries and persistence by domain.
- `src/lib/server/actions` contains reusable action handlers shared by reader routes.
- `src/lib/server/processing` contains feed polling and article-processing workflows.

Reader views are available at `/`, `/highlights`, `/saved`, and `/streams/[id]`. Feed,
stream, and operational management live at `/feeds`, `/streams`, and `/diagnostics`.

Do not use the placeholder D1 ID in production. Authentication and database creation are Cloudflare account operations and are intentionally not performed by the project build.
