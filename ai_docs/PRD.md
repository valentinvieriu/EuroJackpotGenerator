# Product Requirements Document – EuroJackpot Simulator

**Status:** In Review
**Version:** 1.0
**Last Updated:** 2025-08-10
**Owner:** TBD
**Approvers:** TBD

## 1. Change Log _(Optional)_

| Version | Date       | Description                                  | Author |
| ------: | ---------- | -------------------------------------------- | ------ |
|     1.0 | 2025-08-10 | Consolidated final PRD from prior draft docs | —      |

## 2. Overview

EuroJackpot Simulator is a web application that lets users explore EuroJackpot **system tickets** (5/50 + 2/12), run a **single mock draw**, or execute **large-scale Monte Carlo simulations**. It shows **costs, potential winnings, ROI, and distributions** using official win-class structures and (optionally) historically weighted number generation. It is an educational/entertainment tool and **does not predict real draws**.

## 3. Objectives

- Help users **understand costs and typical outcomes** of system tickets.
- Enable **experimentation** via single-draw and mass simulations with clear summaries (ROI, win rate, distributions).
- Provide a **fast, responsive** experience, resilient to external API hiccups (fallbacks, caching).
- Promote **responsible play** with clear, on-page disclaimers.

## 4. Success Metrics

- **Engagement:** Average session duration > 3 minutes.
- **Feature Adoption:** ≥ 20% of users who generate tickets run a simulation (single or Monte Carlo).
- **Performance:** P95 API latency for `/api/generate` and `/api/simulate` < 1500 ms.
- **Reliability:** API error rate < 0.1% (with graceful fallbacks).
- **Completion:** % of Monte Carlo runs started that finish successfully.

## 5. Timeline _(Optional)_

- **V1 (public):** System ticket generation, Single Draw, Monte Carlo with progress and final analytics, JSON export (when enabled), payout/statistics from public sources, fallbacks, disclaimer.
- **Post-V1 (ideas):** Local "save my setup", i18n/currency options, deeper explainers. _(Ideas only; not committed.)_

## 6. Personas _(Optional)_

- **Curious players:** Compare systems (e.g., 5/7 vs 6/3) and see costs.
- **Strategy hobbyists:** Run **100–10,000** simulations to observe tendencies and variance.
- **Budget-minded users:** Understand **€2.00/line** pricing and total run costs.

## 7. User Scenarios _(Optional)_

1. **Generate & Single Draw:** User selects a system preset and ticket count (1–500); app shows total price; a single mock draw highlights matches and shows winnings and ROI.
2. **Monte Carlo Run:** User configures **100–10,000** simulations; progress streams via NDJSON with partial stats; final report shows totals, ROI, distributions, and percentiles; optional JSON export when enabled; cancel stops after current batch.

## 8. Scope

**In Scope**

- System ticket generation (unique tickets per batch; **€2.00/line** pricing).
- Single mock draw with highlights and winnings from win-class payouts (with fallbacks).
- Monte Carlo simulation with real-time progress (NDJSON), final analytics, and optional result export.
- Responsible-play disclaimer and accessible, responsive UI.

**Out of Scope**

- Real-money play, accounts, payments, or checkout.
- Predicting actual future draws.
- Historical draw lookup by date (beyond odds/frequency data used for simulation).

## 9. Non-Goals _(Optional)_

- Personalized number advice or guaranteed profit strategies.
- Social features or cloud saves (beyond optional local export).

## 10. Requirements

- **FR-1: Ticket Generation**
  - Users choose system presets (e.g., 5/2, 5/3… 7/3 or equivalent counts).
  - Generate **1–500** unique tickets per request.
  - Display **total price** immediately (lines × **€2.00**).
  - Users can choose **Uniform** or **Weighted by previous-draw stats** for ticket generation (default weighted; falls back to uniform on data issues).
  - Configuration immediately persisted to URL for zero state loss on page refresh.

- **FR-2: Single Draw Simulation**
  - Draw and display **5 main + 2 Euro** numbers.
  - Highlight matches on all tickets.
  - Compute **total winnings**, **net**, and **ROI** via win-class payouts (use fallback payouts if live data is unavailable).

- **FR-3: Monte Carlo Simulation**
  - Configure **100–10,000** simulations and a **batch size**.
  - Stream **progress** via NDJSON (completed/total, elapsed, ETA hint, current win rate/ROI, biggest win, class distribution).
  - Provide **final report**: totals (cost, winnings, net), ROI%, EV, class distribution, mean/median/std, p25/p75/p95, % profitable simulations, best result.
  - **Cancel** stops after current batch.
  - **Export** detailed per-simulation results as JSON when enabled (disabled over 1,000 sims at the UI for memory).

- **FR-4: Configuration Sharing & Persistence**
  - **Immediate persistence**: Form configuration automatically saved to URL with zero state loss.
  - **Unified sharing format**: Single URL structure for both state persistence and exact reproduction.
  - **Optional reproducibility**: Shareable links include seed for deterministic ticket generation.
  - **Quality randomness**: Default unseeded generation for better distribution, seeded only when sharing.

- **FR-5: Pricing & Transparency**
  - **€2.00 per line** consistently applied; lines = C(m,5) × C(e,2).

- **NFR-1: Performance**
  - API endpoints should return in < 2 s under typical load; Monte Carlo keeps UI responsive via streaming.

- **NFR-2: Reliability**
  - Graceful handling of external API failures (timeouts, normalization quirks); fallbacks for payouts and statistics.

- **NFR-3: Usability & Accessibility**
  - Clear labels, color-coding for wins/classes, keyboard navigation, mobile-friendly layout.

- **NFR-4: Compatibility**
  - Latest versions of major desktop browsers (Chrome, Firefox, Safari, Edge).

- **NFR-5: State Management**
  - **Configuration persistence:** Zero state loss on page refresh via immediate URL synchronisation
  - **Backwards compatibility:** Legacy URL formats automatically upgraded without breaking existing shares
  - **Type safety:** All state transitions validated with Zod schemas at runtime
  - **SSR readiness:** Ephemeral state management compatible with future server-side rendering
  - **Memory efficiency:** Simulation results cached intelligently with configurable expiration (10 minutes for odds)
  - **Error boundaries:** Graceful fallbacks when stores unavailable or external APIs fail

## 11. Assumptions and Dependencies

- **Rules:** EuroJackpot 5/50 + 2/12; win classes **1–12**.
- **Pricing:** **€2.00 per line**.
- **External Data:** Lotto Bayern public endpoints for payout odds (classes may appear as **101–112**, normalized to **1–12**) and frequency stats.
- **Platform:** Nuxt 4 + Vue 3 frontend; Nitro serverless API on **Cloudflare Workers**.

## 12. Open Questions

- Offer a UI toggle to compare **uniform vs historically weighted** generation?
- Soft warning/cap on large total spend per run?
- Country-specific disclaimers where appropriate?

## 13. Release Plan _(Optional)_

- **Mode:** Public V1
- **Criteria:** Functional requirements met; fallbacks verified; performance targets met; disclaimer present; basic analytics enabled.
- **Notes:** Gradual iteration post-V1 for UX polish and optional features.

## 14. Analytics & Telemetry _(Optional)_

- **Events/KPIs:** ticket generation, single-draw runs, Monte Carlo starts/completions, export usage, fallback usage, error counts.
- **Review Cadence:** Weekly KPI review against Success Metrics.
- **Data Considerations:** No PII stored; exports are user-initiated.

## 15. Messaging _(Optional)_

- **Target audience:** Lottery enthusiasts and data-curious users.
- **Key message:** "A safe, educational sandbox to explore EuroJackpot system tickets, costs, and typical outcomes — **not** a prediction tool."

## 16. Approvals _(Optional)_

- [ ] Product:
- [ ] Engineering:
- [ ] Design:
- [ ] Legal/Compliance:

## 17. Related Documents _(Optional)_

- [Architecture](./ARCHITECTURE.md)
- [Common Guide](./COMMON_GUIDE.md)
- [Prior Architecture Drafts](./gpt_1_ARCHITECTURE.md), [./gemini_1_ARCHITECTURE.md]
- [Prior PRD Drafts](./gpt_1_PRD.md), [./gemini_1_PRD.md)
