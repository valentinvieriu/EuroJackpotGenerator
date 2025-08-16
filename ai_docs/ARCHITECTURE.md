# Architecture – EuroJackpot Simulator

This document provides a high-level overview of the EuroJackpot Simulator application. Its purpose is to help an AI assistant understand the system's design for future development tasks.

**Core Technology:**

- **Framework:** Nuxt 4 (Vue 3) SPA
- **API:** Nitro serverless functions
- **Deployment:** Cloudflare Workers
- **External Data:** Lotto Bayern public API for odds and statistics.

---

## 1. System Overview

The application is a Single Page Application (SPA) with a serverless backend. A Pinia-based state management layer mediates all interactions between the UI components and the server, handling business logic, caching, and state synchronization.

For development guidelines and workflows, see [COMMON_GUIDE.md](./COMMON_GUIDE.md). For product requirements, see [PRD.md](./PRD.md).

```mermaid
sequenceDiagram
    participant User
    participant UI Components
    participant TicketsStore as "Tickets Store (Pinia)"
    participant SimStore as "Simulation Store (Pinia)"
    participant OddsStore as "Odds Store (Pinia)"
    participant Server as "Server Endpoints (/api/*)"
    participant LottoBayern as "Lotto Bayern API"

    Note over User, LottoBayern: Ticket Generation Flow
    User->>UI Components: Configures ticket settings
    UI Components->>TicketsStore: Calls generate() action
    TicketsStore->>Server: POST /api/generate
    Server->>LottoBayern: Fetch frequency stats (cached)
    LottoBayern-->>Server: Stats data
    Server-->>TicketsStore: Receives generated ticket objects
    TicketsStore->>TicketsStore: Updates its state with new tickets
    TicketsStore-->>UI Components: UI reactively updates to show tickets

    Note over User, LottoBayern: Single Draw Simulation Flow
    User->>UI Components: Clicks "Run Single Draw"
    UI Components->>SimStore: Calls runSingleDraw() action
    SimStore->>Server: POST /api/simulate (to get winning numbers)
    Server-->>SimStore: Returns one set of winning numbers
    SimStore->>OddsStore: Calls fetchOdds() action for payout data

    alt Odds Cache is stale or empty
        OddsStore->>Server: GET /api/fetchWinningData
        Server->>LottoBayern: Fetch latest odds data
        LottoBayern-->>Server: Odds data
        Server-->>OddsStore: Payout data is returned
        OddsStore->>OddsStore: Updates its local cache
    end
    OddsStore-->>SimStore: Returns odds from cache

    SimStore->>SimStore: Calculates results, updates its state
    SimStore-->>UI Components: UI reactively updates to show single draw results

    Note over User, LottoBayern: Monte Carlo (Mass Simulation) Flow
    User->>UI Components: Clicks "Start Mass Simulation"
    UI Components->>SimStore: Calls startSimulation() action
    SimStore->>Server: POST /api/batchSimulate (initiates NDJSON stream)
    Server->>LottoBayern: Fetch odds data (once at the start)
    LottoBayern-->>Server: Odds data
    Server-->>SimStore: Streams back NDJSON progress events

    loop For each received progress event
        SimStore->>SimStore: Processes the event, updates progress state
        SimStore-->>UI Components: UI reactively updates the progress bar & summary
    end
    Server-->>SimStore: Streams back the final NDJSON result event
    SimStore->>SimStore: Processes final result, updates state to 'results'
    SimStore-->>UI Components: UI reactively switches to the results view
```

---

## 2. Core Components & Logic

### Frontend (`app/`)

The frontend is responsible for the user interface and delegates all complex logic to the Pinia stores.

- **UI Components:**
  - `TicketGenerator.vue`: The main user interface for configuring tickets. It dispatches actions to the `TicketsStore`.
  - `SingleDrawPanel.vue` & `MonteCarloPanel.vue`: These components initiate simulations by calling actions on the `SimulationStore` and reactively display the state (progress, results, errors) managed by the store.

- **State Management (Pinia Stores):**
  - `stores/tickets.ts`: Manages the ticket generation lifecycle, holds the list of generated tickets, and syncs the URL state.
  - `stores/simulation.ts`: A state machine for both single draw and Monte Carlo simulations (`config` -> `running` -> `results`). It encapsulates all the logic for fetching data, processing streams, and calculating results.
  - `stores/odds.ts`: Caches winning odds from the `/api/fetchWinningData` endpoint to prevent redundant API calls.

- **Utilities (`app/utils/`):**
  - `combinatorics.ts`: Core logic for calculating line counts and determining win classes.
  - `batchStatistics.ts`: Client-side helpers for processing the final aggregated results from a Monte Carlo simulation.
  - `urlHash.ts`: Logic for encoding and decoding application state to/from the URL hash for persistence and sharing.

### Backend API (`server/api/`)

The backend provides four main serverless endpoints. All endpoints use **Zod** for strict input and output validation.

- **`/api/generate`**: Generates unique lottery tickets (1-500 per request). It can use a uniform random algorithm or a weighted one based on historical stats (cached for 10 minutes).

  ```pseudocode
  // The server handles the core generation logic
  function generate(ticket_config):
    if ticket_config.method == "weighted" and not ticket_config.seed:
      stats = get_cached_statistics()
      return generate_weighted_tickets(stats)
    else:
      return generate_uniform_tickets() // Can be seeded
  ```

- **`/api/simulate`**: Simulates a single draw, returning one set of winning numbers. Uses a cryptographically secure RNG unless a `seed` is provided for deterministic results.

- **`/api/fetchWinningData`**: A proxy to the Lotto Bayern API for winning odds. It includes an 8-second timeout and uses a hardcoded fallback on failure.

- **`/api/batchSimulate`**: The engine for Monte Carlo simulations (100-10,000 simulations).
  - **Streaming:** Streams progress back to the client using **NDJSON** (`application/x-ndjson`) to keep the UI responsive.
  - **Logic:**

    ```pseudocode
    function batchSimulate(tickets, simulation_count):
      // Fetch odds once at the start
      odds_map = fetch_and_normalize_odds()
      stream = create_ndjson_stream()

      // Process in chunks to avoid blocking the event loop
      loop over simulation_count in batches:
        batch_results = run_simulations_for_chunk(...)
        progress_summary = aggregate(batch_results)
        stream.write({ type: "progress", data: progress_summary })

      // Send final, detailed statistics when done
      final_result = calculate_final_statistics()
      stream.write({ type: "result", data: final_result })
      stream.close()
    ```

---

## 3. State Management Strategy (3-Layer Architecture)

The application follows a strict **3-layer state model** that enforces clear separation of concerns and ensures maintainability:

### Layer 1: URL Persistence (Configuration State)

- **PURPOSE**: Shareable, bookmarkable configuration that survives page refreshes.
- **WHEN TO USE**: User-defined simulation parameters (e.g., system type, number of tickets), reproducible seeds.
- **IMPLEMENTATION**: The `TicketsStore` decodes the URL hash on page load and encodes it back on any configuration change.
- **EXAMPLE**: `const config = { system: '7x3', tickets: 50, seed: 'LUCKY123' }` is synced to the URL hash `#system=7x3&tickets=50&seed=LUCKY123`.

### Layer 2: Pinia Domain Stores (Business Logic & Caching)

- **PURPOSE**: Managing complex state machines, business rules, API caching, and side effects.
- **WHEN TO USE**: Simulation lifecycle (`'config' → 'running' → 'results'`), caching API data (like winning odds), and implementing all core application logic.
- **IMPLEMENTATION**: Manages complex state that isn't part of the URL, such as the list of generated tickets, live simulation progress, final results, and cached API data.
- **EXAMPLE**: The `useSimulationStore` handles the entire process of starting a simulation, tracking its progress, and storing results or errors.

### Layer 3: SSR-Safe Ephemeral State (UI State)

- **PURPOSE**: Temporary, non-business UI state that must work with Server-Side Rendering (SSR).
- **WHEN TO USE**: Component-level loading indicators, modal visibility, temporary notifications, UI toggles.
- **IMPLEMENTATION**: `useState` is Nuxt's SSR-safe tool for simple, non-domain state.
- **EXAMPLE**: `const showWelcomeMessage = useState('welcome-visible', () => false)` for a temporary banner.

---

## 4. Key Design Principles

- **Reliability through Fallbacks:** The system is designed to be resilient. If an external API for odds or statistics fails, the application gracefully falls back to using cached or hardcoded data, ensuring core features remain functional.
- **Performance:** Long-running Monte Carlo simulations are offloaded to the server. The NDJSON stream prevents the UI from freezing and provides a responsive user experience with real-time progress.
- **Maintainability:**
  - **Centralized Constants:** All "magic numbers" (e.g., lottery number ranges, ticket limits) are stored in `app/utils/constants.ts`, providing a single source of truth.
  - **Strict Validation:** Zod schemas (`app/schemas/`) are used at all API boundaries to ensure data integrity.
  - **Separation of Concerns:** Business logic is kept in stores and utils, API logic on the server, and UI logic in Vue components.

---

## 5. Testing

The project uses **Vitest** with **happy-dom** for fast and reliable unit testing. The focus is on testing business logic, utilities, and server-side handlers rather than UI components.

- **Testing Strategy:**
  - **Utilities (`app/utils/`):** All critical logic, such as combinatorics, pricing, and RNGs, is thoroughly unit tested.
  - **Server Endpoints (`server/api/`):** API handlers are tested to ensure they correctly validate input, handle errors, and return data in the expected format.
  - **Pinia Stores (`stores/`):** The logic within store actions is tested to verify correct state transitions and side effects.

- **Running Tests:**

  ```bash
  # Run all tests once
  npm test

  # Run tests in watch mode for TDD
  npm test -- --watch
  ```

---

## 6. Deployment & Code Quality

### Deployment

The application is built and deployed as a serverless application to **Cloudflare Workers** using Nitro's built-in preset.

- **Deployment Process:**
  1.  The `npm run build` command compiles the Nuxt app and Nitro server into an optimized format for Cloudflare.
  2.  The `npm run deploy` command uses the Wrangler CLI to publish the build output to the Cloudflare network.

### Code Quality

To ensure a high standard of code quality and consistency, the project enforces strict linting and formatting rules.

- **Tools:**
  - **ESLint:** For static code analysis and enforcing coding standards. `npm run lint`
  - **Prettier:** For consistent and automatic code formatting. `npm run format`

- **Pre-commit Hook (Mandatory):**
  - The project uses **Husky** and **lint-staged** to run ESLint and Prettier on all staged files before a commit is created.
  - **You cannot commit code that fails these checks.** This policy guarantees that all code in the repository adheres to the established formatting and linting rules, preventing style inconsistencies and common errors.
