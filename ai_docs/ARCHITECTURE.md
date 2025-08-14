# Architecture – EuroJackpot Simulator

> Runtime: **Nuxt 4 + Vue 3 SPA** on the edge with a **Nitro** serverless API deployed to **Cloudflare Workers**.  
> External data: **Lotto Bayern** public endpoints (odds + statistics).  
> Purpose: Educational simulator for EuroJackpot system tickets (5/50 + 2/12), single-draw and Monte Carlo.

---

## 1) System Overview

```mermaid
sequenceDiagram
    participant UI as Frontend (Vue 3 SPA)
    participant GEN as /api/generate
    participant SIM as /api/simulate
    participant ODDS as /api/fetchWinningData
    participant BATCH as /api/batchSimulate
    participant STATS as statisticsManager
    participant LB as Lotto Bayern APIs

    Note over UI: User configures ticket system
    UI->>GEN: POST /api/generate<br/>{ticketCount, mainCount, euroCount}
    GEN->>STATS: fetch historical frequencies (cached 10min)
    STATS->>LB: GET statistics endpoint
    LB-->>STATS: frequency data
    STATS-->>GEN: weighted probabilities
    GEN->>GEN: generate unique tickets using weights
    GEN-->>UI: tickets array with linesCount

    Note over UI: Single Draw Simulation
    UI->>SIM: POST /api/simulate<br/>{seed?}
    SIM->>SIM: generate winning numbers
    SIM-->>UI: {draw, meta}
    UI->>ODDS: GET /api/fetchWinningData
    ODDS->>LB: GET odds endpoint (8s timeout)
    LB-->>ODDS: winning odds data
    ODDS-->>UI: normalized odds (classes 1-12)
    UI->>UI: calculate winnings & ROI

    Note over UI: Monte Carlo Batch Simulation
    UI->>BATCH: POST /api/batchSimulate<br/>Accept: application/x-ndjson<br/>{tickets, simulationCount, batchSize}
    BATCH->>LB: fetch current odds
    LB-->>BATCH: odds data
    loop for each batch (default 100 sims)
        BATCH->>BATCH: generate winning numbers
        BATCH->>BATCH: calculate winnings per ticket
        BATCH-->>UI: NDJSON progress line<br/>{type:"progress", summary}
    end
    BATCH->>BATCH: aggregate final statistics
    BATCH-->>UI: NDJSON result line<br/>{type:"result", highlightingData}
    UI->>UI: apply highlights & play win sound
```

- **Frontend (FE)**: SPA renders Ticket generator, Single Draw, and Monte Carlo panels.
- **API**: `/api/generate`, `/api/simulate`, `/api/fetchWinningData`, `/api/batchSimulate` (supports **NDJSON streaming**).
- **External**: Lotto Bayern endpoints for odds + frequency stats (with **normalization & fallbacks**).

---

## 2) Key Components

### Frontend (app/)

- **Components**
  - `TicketGenerator.vue`: Configures ticket systems and quantity; shows total cost; orchestrates Single Draw & Monte Carlo panels.
  - `SingleDrawPanel.vue`: Calls `/api/simulate` + `/api/fetchWinningData`, highlights matches, computes winnings/ROI, plays a short **Web Audio API** “win” tone.
  - `MonteCarloPanel.vue`: Runs `/api/batchSimulate` with **NDJSON** progress; renders `BatchSimulationProgress.vue` and `BatchSimulationResults.vue`; applies result-driven ticket highlights.
  - Visuals: `TicketNumber.vue` and `TicketNumber3DSimple.vue` (canvas-based 3D badges).

- **Utilities**
  - `numberGenerator.ts`: Weighted-with-fallback number generation. Uses Efraimidis–Spirakis-style keys (`log(u)/w`) over **sqrt(weight)** to gently de-emphasize outliers. Falls back to crypto-backed uniform.
  - `rng.ts`: Crypto-backed RNG where available.
  - `combinatorics.ts`: `nCr`, cartesian expansion, and **win class** line-count math for system tickets.
  - `winningClasses.ts`: Maps (matched main, matched euro) → win class (1–12).
  - `payout.ts`: Builds class→amount map from odds payload.
  - `odds.ts`: Normalizes Lotto Bayern classes **101–112 → 1–12**.
  - `statisticsManager.ts`: Fetches frequency statistics with **10-minute cache**; returns `null` on invalid/failed fetch (triggers uniform fallback).
  - `batchStatistics.ts`: Aggregates batch results (ROI, EV, percentiles, win distribution) and simulates a single draw over system tickets.
  - `time.ts`: Friendly durations for progress UI.
  - `audioUtils.ts`: Short win tones based on profit ratio.

- **Styling**
  - Tailwind with custom “casino” palette (`tailwind.config.js`, `app/assets/css/tailwind.css`).

### API (server/api/)

- **`/api/generate` (POST)**
  Validates input with **zod**, and generates unique tickets server-side. Uses weighted stats when available (10-minute cache) and falls back to uniform. Adds `linesCount = C(m,5)×C(e,2)`. Ticket generation is server-only; seeds are accepted here for reproducibility and are not used on the client.
- **`/api/simulate` (GET/POST)**
  Draw generator:
  - If `seed` provided → deterministic via `server/utils/seededRng.ts` (sorted, unique).
  - Else uses uniform crypto-backed `generateRandomNumbers`.
  - Returns `{ draw: { mainNumbers, euroNumbers }, meta: { algorithm, seed?, generatedAt } }`.

- **`/api/fetchWinningData` (GET)**
  Fetches previous draw odds from Lotto Bayern (with **8s timeout**); validates via zod; **fallback odds** on error/invalid.
- **`/api/batchSimulate` (POST)**
  Runs N simulated draws:
  - Accepts `application/json` or **`application/x-ndjson`** for streaming progress.
  - For each chunk (default 100): generates winning numbers, tallies system-line wins per ticket, computes payouts via odds map, accumulates **highlightingData** for UI.
  - Final aggregates include totals, ROI, EV, percentiles, win distribution, and optional per-simulation results (guarded in UI for >1000).

### Validation & Error Handling (server/utils/)

- **`validation.ts`**
  - `validateInput/validateOutput/validateExternalResponse` (zod wrappers; consistent **4xx/5xx**).
  - `fetchWithTimeout` (defaults to 10s; returns 504 on abort).
  - `handleEndpointError` – converts thrown errors to h3 `createError` consistently.

- **`seededRng.ts`**
  Fast deterministic PRNG + unique sorted sampler.

---

## 3) Data Flow

### Single Draw (seeded or random)

```mermaid
sequenceDiagram
  participant UI as UI (SingleDrawPanel)
  participant API as /api/simulate
  participant ODDS as /api/fetchWinningData

  UI->>API: GET/POST simulate (optional seed)
  API-->>UI: { draw, meta }
  UI->>ODDS: GET fetchWinningData
  ODDS-->>UI: odds (or fallback)
  UI->>UI: compute winClassCounts per ticket + total winnings/ROI
```

### Monte Carlo (NDJSON streaming)

```mermaid
sequenceDiagram
  participant UI as UI (MonteCarloPanel)
  participant API as /api/batchSimulate
  participant LB as Lotto Bayern

  UI->>API: POST (tickets, simulationCount, batchSize) Accept: application/x-ndjson
  API->>LB: fetch odds (normalize or fallback)
  loop per chunk
    API-->>UI: progress line (NDJSON)
  end
  API-->>UI: final result line (NDJSON)
  UI->>UI: apply highlights & play win sound (if ROI>0)
```

---

## 4) Domain Rules & Calculations

- **System ticket lines**: `C(m,5) * C(e,2)`; **€2.00/line** (see `pricing.ts`).
- **Win classes**: 1–12 per `(matched main, matched euro)` (mapping in `winningClasses.ts`).
- **Batch simulation**: for each ticket, compute **count of winning lines by class** via combinatorics; payout = Σ(count × class amount).
- **Odds normalization**: Some external responses encode classes as `101–112`; app normalizes to `1–12`.

---

## 5) Reliability & Fallbacks

- **Statistics**: 10-minute cache; if unavailable/invalid → **uniform** number generation.
- **Odds**: External failures/invalid → **fallback odds** (both `/fetchWinningData` and `/batchSimulate`).
- **Timeouts**: 8s on winning data endpoint fetch; 10s default in util.
- **Streaming**: NDJSON keeps UI responsive for large N.

---

## 6) Performance

- **Targets (PRD)**: P95 API latency < 1.5s for `/generate` and `/simulate`.
- **Batch**: Chunked processing (default 100) to bound memory & enable progress.
- **Crypto RNG**: Uses `crypto.getRandomValues` when available; otherwise `Math.random` fallback.

---

## 7) Security & Data

- No accounts/PII; no server-side persistence.
- External requests are read-only public endpoints.
- Client exports JSON only on user action.

---

## 8) Testing

- **Vitest + happy-dom**.
  Coverage:
  - RNG determinism/distribution, seeded sampling.
  - Combinatorics, pricing, time formatting.
  - Odds normalization, payout map.
  - Batch stats aggregation and EV calculation.
  - API route validation and Accept header behavior.

---

## 9) Deployment

- **Cloudflare Workers** via Nitro.
- Commands: `npm run dev/build/preview/deploy`.
- Ensure `public.apiBase` is configured (Nuxt runtime config) for FE→API calls.

---

## 10) State Management & URL Persistence

### Configuration Persistence

- **Immediate URL Sync**: All form configuration automatically persisted to URL
- **Zero State Loss**: Page refresh never loses user configuration work
- **Unified Format**: Single URL structure handles both state persistence and sharing
- **Optional Reproducibility**: Shareable links include seed for exact reproduction

### URL Structure

- **State Persistence**: Parameters reflect current form configuration
- **Shared Reproduction**: Additional seed parameter enables exact ticket reproduction
- **Clean Entry Points**: Fresh visitors see clean URLs for SEO optimization
- No legacy URL upgrade: only the current unified format is supported

### Randomness Quality

- **Default Unseeded**: Most generations use true randomness for better distribution
- **Seeded When Shared**: Reproducible generation only when explicitly sharing
- **Optimal Distribution**: Eliminates forced seeding with potentially clustered values

## 11) State Management Architecture

The application implements a **3-layer state management system** combining URL-based persistence, Pinia domain stores, and SSR-safe ephemeral state.

### Layer 1: URL-Based State (Source of Truth)

**Purpose:** Canonical state for shareable configuration
**Location:** `app/utils/urlHash.ts`, `app/schemas/urlConfig.ts`

```mermaid
graph LR
    A[User Action] --> B[Form State]
    B --> C[URL Update]
    C --> D[Browser History]
    D --> E[Page Refresh]
    E --> F[State Restoration]
    F --> B
```

**Features:**

- **Immediate persistence:** Zero state loss on page refresh
- **Zod validation:** Type-safe URL parsing with schema validation
- **Smart sharing:** Unified format for persistence and reproduction

**Key Functions:**

- `parseUrlHash()`: Parses the current unified URL format
- `validateAppConfig()`: Zod-based configuration validation
- `updateBrowserUrl()`: Immediate URL synchronisation

### Layer 2: Pinia Domain Stores (Complex State)

**Purpose:** Centralised management for complex, cacheable domain state
**Location:** `stores/`

#### Simulation Store (`stores/simulation.ts`)

Manages Monte Carlo simulation lifecycle and complex state machine:

```typescript
type SimulationPhase = 'config' | 'running' | 'results' | 'cancelled' | 'error'

interface SimulationState {
  phase: SimulationPhase
  config: SimulationConfig | null
  progress: SimulationProgress | null
  results: BatchSimulationResult | null
  abortController: AbortController | null
}
```

**Capabilities:**

- **NDJSON streaming:** Real-time progress updates
- **Abort handling:** Cancellable long-running operations
- **Error recovery:** Comprehensive error state management
- **Result caching:** Persistent simulation results

#### Odds Store (`stores/odds.ts`)

Manages cached payout data with intelligent fallbacks:

```typescript
interface OddsCache {
  data: EurojackpotHistoricOdds | null
  timestamp: number
  isLoading: boolean
  error: string | null
}
```

**Capabilities:**

- **10-minute cache:** Matches server-side cache duration
- **Fallback odds:** Graceful degradation when API unavailable
- **Request deduplication:** Prevents multiple concurrent API calls
- **Cache statistics:** Monitoring and debugging support

### Layer 3: SSR-Safe Ephemeral State (useState)

**Purpose:** Temporary UI state that must be SSR-compatible
**Location:** `app/composables/useAppState.ts`

#### Audio State (`useAudioState`)

```typescript
const audioEnabled = useState('audio-enabled', () => true)
const winSoundLevel = useState<'none' | 'low' | 'medium' | 'high'>(
  'win-sound-level',
  () => 'medium'
)
```

#### Transient Errors (`useTransientErrors`)

```typescript
const errors = useState<string[]>('transient-errors', () => [])
// Auto-clearing errors with configurable duration
```

#### UI State (`useUIState`)

```typescript
const showGenerationForm = useState('show-generation-form', () => false)
const showWelcomeMessage = useState('show-welcome-message', () => false)
// Other ephemeral UI toggles
```

### State Flow Architecture

```mermaid
sequenceDiagram
    participant URL as URL State
    participant UI as Component
    participant Pinia as Pinia Store
    participant API as API Layer
    participant useState as useState

    Note over URL: Configuration loaded from URL
    URL->>UI: Initial state restoration
    UI->>useState: Ephemeral UI state
    UI->>Pinia: Complex operations (simulation)
    Pinia->>API: Data fetching with caching
    API-->>Pinia: Cached results
    Pinia-->>UI: Reactive state updates
    UI->>URL: Configuration changes (immediate sync)
```

### State Persistence Strategy

| State Type          | Persistence       | Scope             | Example                          |
| ------------------- | ----------------- | ----------------- | -------------------------------- |
| **Configuration**   | URL Hash          | Global, Shareable | Ticket type, count, method       |
| **Domain Data**     | Pinia (Memory)    | Session           | Simulation results, cached odds  |
| **Ephemeral UI**    | useState (Memory) | Request/SSR       | Loading states, error messages   |
| **Component Local** | ref/reactive      | Component         | Form validation, temporary flags |

### Benefits of 3-Layer Architecture

1. **Performance:** Reduced API calls through intelligent caching
2. **User Experience:** Zero configuration loss on page refresh
3. **SSR Compatibility:** Future-ready for hybrid rendering
4. **Type Safety:** Zod validation throughout state layers
5. **Maintainability:** Clear separation of concerns
6. **Testability:** Isolated state layers for unit testing

### Migration Strategy

Legacy URL formats are no longer supported. All links must use the unified format documented above.

## 12) Open Items / Future

- Optional toggle: **uniform vs weighted** generation in UI.
- Basic telemetry/analytics (not in code yet).
- i18n/currency options.

````

---

## `ai_docs/COMMON_GUIDE.md`

```markdown
# Common Guide – EuroJackpot Simulator

This guide collects day-to-day conventions and “how-tos” for contributors.

---

## 1) Getting Started

```bash
# Install
npm install

# Dev (http://localhost:3000)
npm run dev

# Tests
npm test

# Lint / Format
npm run lint
npm run format

# Build & preview (workers)
npm run build
npm run preview

# Deploy to Cloudflare Workers
npm run deploy

# Worker typegen (optional)
npm run cf-typegen
````

**Nuxt runtime config**
Frontend components read `useRuntimeConfig().public.apiBase` (e.g. `/api`).
Set this in `nuxt.config` or via env (e.g. `NUXT_PUBLIC_API_BASE=/api`).

---

## 2) Project Structure (short)

- **Frontend** (`app/`)
  - `components/` – UI (Ticket generator, Single Draw, Monte Carlo)
  - `utils/` – RNG, number generation, combinatorics, payout, statistics cache, audio, etc.
  - `schemas/` – **zod** request/response schemas shared with server
  - `types/` – TS interfaces for tickets, stats, winning odds
  - `assets/css/` – Tailwind entry

- **API** (`server/api/`)
  - `generate.ts`, `simulate.ts`, `fetchWinningData.ts`, `batchSimulate.ts`

- **Server utils** (`server/utils/`)
  - validation helpers, timeout fetch, seeded RNG

- **Docs** (`ai_docs/`) – PRD, ARCHITECTURE, this guide

---

## 3) Coding Conventions

### TypeScript + Zod

- Always validate **inputs** at route boundaries with `validateInput(schema, raw, context)`.
- Validate **outputs** with `validateOutput(schema, data, context)`.
- External API responses: `validateExternalResponse` + **normalize** if required.
- Keep schemas in `app/schemas/` so both FE and API can import.

### Errors

- Throw `createError({ statusCode, statusMessage, data })` (h3).
- Use `handleEndpointError(err, '/route')` in catch blocks.

### Randomness

- **Simulate (server)**: deterministic when `seed` provided via `server/utils/seededRng.ts`; otherwise crypto-backed uniform.
- **Ticket generation (frontend)**: user chooses **uniform** or **weighted** via front-end toggle; weighted uses statistics (falls back to uniform on data issues).

### Number Generation (weighted)

- Weights are `sqrt(value)` to temper extreme frequencies.
- Selection uses Efraimidis–Spirakis keys `key = log(u)/w` and picks top-k, then sorts ascending for display.

### Combinatorics & Winnings

- Lines per system = `C(m,5) * C(e,2)`; price per line = **€2.00**.
- `calculateWinningLineCounts(m, e, k, h)` returns counts for each win class given ticket size and matches.

### Odds Normalization

- External classes sometimes appear as **101–112**; normalize to **1–12** before use.

---

## 4) API Contracts (short)

- **POST `/api/generate`**
  `body { ticketCount[1..500], mainCount[5..16], euroCount[2..12], algorithm?['uniform'|'weighted'] }`
  → array of tickets `{ id, mainNumbers[], euroNumbers[], linesCount }`.

- **GET/POST `/api/simulate`**
  Optional `{ seed: string }` or query `?seed=...`
  → `{ draw: { mainNumbers[], euroNumbers[] }, meta: { algorithm<'uniform'|'weighted'>, seed?, generatedAt } }`.

- **GET `/api/fetchWinningData`**
  → `EurojackpotHistoricOdds` (or fallback).

- **POST `/api/batchSimulate`**
  Accepts `application/json` or `application/x-ndjson`.
  `body { tickets[], simulationCount[1..100000], includeIndividualResults?, batchSize? }`.
  - **NDJSON progress** lines:

    ```json
    {"type":"progress","progress":{"currentSimulation":n,"totalSimulations":N,"progressPercentage":p}, "summary":{"totalCost":...,"totalWinnings":...,"netProfit":...,"roiPercentage":...,"maxWin":...,"winDistribution":{...}}}
    ```

  - **Final**:

    ```json
    {"type":"result","result":{ totalSimulations, totalCost, totalWinnings, netProfit, roiPercentage, expectedValue, winDistribution, statistics, individualResults?, highlightingData }}
    ```

---

## 5) UI/UX Notes

- Tailwind theme provides **casino** palette. Prefer semantic classes in components.
- Number chips:
  - Main balls vs Euro stars; winner states get gold ring/animation.
  - `TicketNumber3DSimple.vue` uses canvas gradients for a more “premium” look.

- Accessibility: ensure labels for form inputs; keyboard-friendly actions (Enter key triggers single draw).

---

## 6) Testing

- **Unit**: Vitest + happy-dom.
  Focus areas covered: RNG, seeded numbers, combinatorics, pricing, odds normalization, batch stats, API handlers.
- To add tests:
  - Keep them close to the util/route (`app/utils/__tests__`, `server/api/__tests__`).
  - Use deterministic seeds for reproducibility.

---

## 7) Operational Considerations

- **External timeouts**: 8s for odds fetch in `/fetchWinningData`; 10s utility default.
- **Streaming**: prefer `Accept: application/x-ndjson` for large runs; UI renders live progress + ETA.
- **Memory**: UI disables “includeIndividualResults” when `simulationCount > 1000`.

---

## 8) Adding Features – Quick Recipes

- **New API route**
  1. Define zod input/output in `app/schemas`.
  2. Implement route in `server/api/xxx.ts`:
     - `const input = validateInput(schema, await readBody(event), 'context')`
     - Do work
     - `return validateOutput(schema, result, 'context')`

  3. Write tests in `server/api/__tests__/xxx.test.ts`.

- **New calculated metric for batch results**
  1. Implement in `app/utils/batchStatistics.ts`.
  2. Add to result schema (`app/schemas/batchSimulation.ts`).
  3. Render in `BatchSimulationResults.vue` (and progress if needed).

- **Styling**
  Use Tailwind; avoid hard-coded colors when the semantic palette exists.

---

## 9) Responsible Play & Messaging

- Keep on-page disclaimer visible (already present on index page).
- Do not imply prediction capability; this is an **educational simulator**.

---

## 10) Troubleshooting

- **No stats / all uniform**: The stats API may be down; `statisticsManager` will log and return `null`, which is expected.
- **Odd classes 101–112**: Ensure `normalizeOdds` is applied (batch endpoint already does this).
- **NDJSON not streaming**: Verify `Accept` header is exactly `application/x-ndjson` and that the client reads by line with a `TextDecoder`.
