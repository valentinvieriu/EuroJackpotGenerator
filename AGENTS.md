# Repository Guidelines

## Project Structure & Module Organization

- Source: `pages/` (routes), `components/` (UI), `utils/` (helpers), `types/` (TS types), `server/` (Nitro/CF workers endpoints), `assets/` (unprocessed), `public/` (static).
- Config: `nuxt.config.ts`, `tailwind.config.js`, `wrangler.toml` (Cloudflare Workers), `env.d.ts`.
- Build output: `.nuxt/` (build cache) and `dist/` (deployment). Do not commit generated files.

## Build, Test, and Development Commands

- `npm run dev`: Start Nuxt in development with HMR.
- `npm run build`: Production build.
- `npm run generate`: Generate static output when appropriate.
- `npm run preview`: Build, then run Cloudflare dev via Wrangler.
- `npm run deploy`: Build and deploy using Wrangler.
- `npm run cf-typegen`: Update Cloudflare worker types.

Example: to iterate locally against the Workers runtime, use `npm run preview`.

## Coding Style & Naming Conventions

- Language: Vue 3 + Nuxt 3 with TypeScript. Prefer `<script setup lang="ts">`.
- Indentation: 2 spaces; single quotes; trailing commas where valid.
- Components: PascalCase file names in `components/` (e.g., `TicketGenerator.vue`).
- Pages: kebab-case Vue files in `pages/` map to routes (e.g., `results.vue`).
- Styling: Tailwind CSS utilities; keep component-scoped styles minimal.
- No linter is configured; follow these conventions for consistency.

## Testing Guidelines

- No test runner is configured yet. Recommended: Vitest for unit tests and Playwright for e2e.
- Naming: `*.spec.ts` colocated with source or under `tests/` mirroring structure.
- Aim for fast unit tests around `utils/` and critical server routes; add coverage for number generation logic and winnings calculation.
- Run with future scripts like: `vitest run` or `npm test` once added.

## Commit & Pull Request Guidelines

- Commits: imperative tone, concise summary, scope when helpful (e.g., "components: refine ticket generation UI").
- Group related changes; avoid noisy formatting-only commits without context.
- PRs: include description, rationale, and before/after screenshots for UI; link issues; note any config changes (`wrangler.toml`, `nuxt.config.ts`).
- Checklist: self-review, run `npm run build`, verify `npm run preview` locally, and ensure no generated files are committed.

## Security & Configuration Tips

- Secrets: use `wrangler secret put <NAME>`; do not store secrets in repo.
- Environments: manage via `wrangler.toml` environments and Cloudflare dashboards.
- Keep dependencies minimal; prefer `utils/` helpers over heavy libs.
