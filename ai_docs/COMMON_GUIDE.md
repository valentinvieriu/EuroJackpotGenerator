# EuroJackpot Simulator — Compact Dev Guide

**What**: Educational lottery simulation demonstrating EuroJackpot system ticket mathematics through Monte Carlo analysis. Helps users understand costs, probabilities, ROI, and statistical distributions by running realistic simulations with official win-class structures. Built to teach probability theory and debunk lottery misconceptions through interactive data visualization.

**Stack**

- Frontend: Nuxt 4, Vue 3 (Composition API), TypeScript, Pinia
- Backend: Cloudflare Workers (Nitro), NDJSON streaming
- Quality: Zod, Vitest, ESLint, Prettier
- UX: Web Audio API, Canvas, Web Workers

---

## Core Principles (short)

1. **Constants**: All constants in `app/utils/constants.ts` — never hardcode.
2. **Server security**: Ticket generation only in `/server/api/generate`.
3. **3‑Layer state**: URL ↔ Pinia ↔ SSR‑safe store (see `ARCHITECTURE.md`).
4. **Thin components**: UI only; business logic in Pinia stores.
5. **Test logic**: Test stores/utilities/endpoints, not presentation.

---

## Quick start

```bash
npm install
npm run dev # localhost:3000
npm test # tests
npm run lint # lint
npm run format # format
```

---

## Development pattern (condensed)

1. Add Zod schema in `app/schemas/` (URL config included).
2. Add values to `app/utils/constants.ts`.
3. Implement business logic in Pinia stores + tests (edge cases, cleanup).
4. Add validated server endpoint if needed.
5. Create thin UI; use design tokens and accessibility rules.
6. Offload heavy UI (canvas, audio) to Web Workers; keep core deterministic.
7. Run tests, lint, format before commit.

---

## Where things live (short map)

- Business logic: `stores/`, `app/utils/` (generation, scoring, popularity)
- Schemas: `app/schemas/` (Zod)
- Server endpoints: `server/api/`
- Constants: `app/utils/constants.ts`
- Animations/audio: `components/Canvas.vue`, `audioUtils.ts` (Web Worker offload)

---

## Testing & Quality

- **Test**: stores, utilities, schemas, endpoints, state cleanup patterns.
- **Don't test**: visual animations, audio synthesis, trivial event handlers.
- **Precommit**: run lint/format.

---

## Styling & Accessibility

- Token‑first design system (no hardcoded tokens).
- Semantic role classes and adequate contrast.
- Respect `prefers-reduced-motion` and SSR safety.

---

## Debugging checklist

1. Identify layer: URL vs Pinia vs component.
2. Reproduce with a failing test.
3. Isolate & fix; run watch/tests.
4. Verify regression‑free.

---

## Preferred CLI tools — one‑line cheats

- **rg**: code search & preview. Ex: `rg -n "TODO|FIXME" -S -C2 -g '*.{ts,vue}'`.
- **fd**: fast file find for piping: `fd -t f -e ts src/components`.
- **bat**: readable file preview: `bat --style=plain --paging=never package.json`.
- **jq**: deterministic JSON edits (use temp file or `sponge`).
- **yq**: YAML edits for CI/CI workflows (v4 syntax).
- **eza**: tree views, quick repo snapshots: `eza -T --level=2 src`.
- **delta**: human‑friendly diffs: `git -c core.pager=delta diff`.

---

## Quick governance note

This doc provides standards for **how** to work with the codebase, not **permission** to change it. Add an explicit review step if you want changes applied without human sign‑off.
