# EuroJackpot Simulator - AI Agent Guide

A comprehensive guide for AI assistants working with the EuroJackpot lottery simulation application.

## 🎯 Project Overview

EuroJackpot Simulator is an educational lottery simulation application built with Nuxt 4 and Vue 3, deployed on Cloudflare Workers. It helps users understand system ticket costs, run single mock draws, and execute large-scale Monte Carlo simulations with comprehensive analytics.

**Key Features:**

- System ticket generation (5/50 + 2/12 format) with historically weighted probabilities
- Single draw simulation with match highlighting and ROI calculation
- Monte Carlo simulation engine with real-time progress streaming (100-10,000 simulations)
- Comprehensive analytics: distributions, percentiles, profitability rates
- Optional JSON export of detailed simulation results
- Transparent €2.00/line pricing with immediate cost calculation
- Cloudflare Workers edge deployment for global performance
- Graceful fallbacks for external API failures

## 🏗️ Architecture

### Frontend (Nuxt 4 + Vue 3)

- **TicketGenerator.vue**: Main interface for configuration and generation
- **Ticket.vue**: Individual ticket display with winning number highlighting
- **SimulationResult.vue**: Results dashboard with statistics and winnings
- **Custom Tailwind theme**: Casino-inspired colour palette

### Backend (Cloudflare Workers)

- **API Endpoints**: `/api/generate`, `/api/simulate`, `/api/batchSimulate`, `/api/fetchWinningData`
- **Statistics Manager**: 10-minute cached frequency data from external API
- **Number Generator**: Weighted random selection based on historical patterns
- **Winning Manager**: Prize calculation and class determination with fallback payouts
- **Batch Processing**: NDJSON streaming for Monte Carlo simulations with progress updates
- **Validation**: Comprehensive input validation (1-500 tickets, 100-10,000 simulations)

### Data Flow

1. Historical statistics fetched and cached from Lotto Bayern API (with fallbacks)
2. Weighted number generation creates realistic ticket combinations
3. Single draw: immediate simulation with match highlighting and ROI
4. Monte Carlo: batch processing with real-time progress via NDJSON streaming
5. Comprehensive analytics: win distributions, percentiles, profitability analysis
6. Optional detailed result export (disabled for >1,000 simulations)

## ⚡ Development Commands

```bash
# Setup
npm install

# Development (http://localhost:3000)
npm run dev

# Production build
npm run build

# Local preview with Cloudflare Workers
npm run preview

# Deploy to production
npm run deploy

# Update Cloudflare types
npm run cf-typegen

# Run tests (if configured)
npm test
```

## 📁 Project Structure

```
eurojackpot/
├── app/                    # Application source
│   ├── components/         # Vue components
│   ├── pages/             # Route pages
│   ├── types/             # TypeScript definitions
│   └── utils/             # Business logic utilities
├── server/                # Nitro server endpoints
│   └── api/              # API routes
├── cloudflare-preset/     # Custom Cloudflare configuration
├── public/               # Static assets
└── ai_docs/              # Documentation for AI assistants
```

## 🎫 Core Business Logic

### System Tickets

- **Main Numbers**: 1-50 (5-16 selections for system tickets)
- **Euro Numbers**: 1-12 (2-12 selections for system tickets)
- **System Types**: Generate all possible combinations (C(m,5) × C(e,2))
- **Pricing**: Fixed €2.00 per line with immediate total calculation
- **Generation Limits**: 1-500 unique tickets per batch

### Number Generation

- **Weighted Selection**: Based on historical draw frequencies with sqrt smoothing
- **Algorithm**: Efraimidis-Spirakis B-ES for exact weighted sampling without replacement
- **Uniqueness**: Ensures no duplicate tickets within generation batch
- **Validation**: Server-side constraints (5-16 main, 2-12 euro numbers)
- **Fallbacks**: Uniform random generation when weighted data insufficient
- **Caching**: 10-minute cache for statistics to optimise performance

#### Weighted Sampling Without Replacement (Efraimidis–Spirakis, B-ES)

- **Algorithm**: Uses the Efraimidis–Spirakis method for exact weighted sampling without replacement
- **Key formula**: For each candidate with weight `w = sqrt(frequency)`, draw `u ~ U(0,1]` and compute `key = ln(u) / w`. Select the `count` items with largest keys
- **Location**: `app/utils/numberGenerator.ts` → `generateNumbersWithStatsInternal`
- **Fallbacks**: If valid weighted candidates < `count`, falls back to uniform random
- **Benefits**: Avoids bias from CDF-with-rejection methods; numerically stable
- **Testing**: Verify uniqueness and frequency correlation with seeded RNG across many trials

### Winning Classes & Simulation

- **Classes 1-12**: From 5+2 (jackpot) down to 2+1 (minimum win)
- **Prize Calculation**: Live data from Lotto Bayern API with fallback payouts
- **Single Draw**: Immediate simulation with match highlighting and ROI calculation
- **Monte Carlo**: 100-10,000 simulations with real-time progress streaming
- **Analytics**: Win distributions, percentiles (p25/p75/p95), profitability rates
- **Export**: Optional JSON export of detailed results (disabled >1,000 simulations)

#### Odds Normalization & Fallbacks

- **Issue**: Lotto Bayern endpoints sometimes return `winningClass` values as `101–112` instead of `1–12`
- **Solution**: Shared `normalizeOdds()` in `app/utils/odds.ts` converts all classes to `1–12`
- **Usage**: Applied in `/server/api/fetchWinningData.ts` and `/server/api/batchSimulate.ts`
- **Fallbacks**: Default payout structure used when external API fails or returns invalid data

## ⚙️ Development Guidelines

### Code Style

- **Language**: TypeScript with Vue 3 Composition API
- **Formatting**: 2 spaces, single quotes, trailing commas
- **Components**: PascalCase files in `components/`
- **Utilities**: Focused helper functions in `utils/`
- **Styling**: Tailwind utilities with minimal scoped styles

### Testing Strategy

- **Unit Tests**: Focus on `utils/` functions (number generation, validation, analytics)
- **Integration Tests**: API endpoints including NDJSON streaming and batch processing
- **E2E Tests**: Complete flows including Monte Carlo simulations and exports
- **Performance Tests**: Large simulation batches and streaming response validation
- **Recommended Tools**: Vitest for unit tests, Playwright for E2E

### Deployment

- **Environment**: Cloudflare Workers with custom domain
- **Configuration**: `wrangler.toml` for deployment settings
- **Secrets**: Use `wrangler secret put` for sensitive data
- **Monitoring**: Cloudflare observability enabled

## 🔒 Security Considerations

- **Input Validation**: Comprehensive server-side validation for all parameters
- **Rate Limiting**: Ticket generation (1-500) and simulation (100-10,000) limits
- **Resource Protection**: Memory-conscious export limits and batch processing
- **External APIs**: Proper error handling with graceful fallbacks
- **No Sensitive Data**: No API keys or secrets in repository
- **Responsible Gaming**: Clear disclaimers about educational/entertainment purpose

## 🎨 UI/UX Features

- **Responsive Design**: Optimised for desktop and mobile
- **Casino Theme**: Professional lottery interface with gold accents
- **Real-time Feedback**: Immediate price calculation and progress streaming
- **Interactive Elements**: Match highlighting, result filtering, analytics visualisation
- **Accessibility**: Proper labels, ARIA attributes, keyboard navigation
- **Performance**: Edge deployment with streaming updates for long-running operations

## ⚙️ Common Workflows

### Adding New Features

1. Define types in `/app/types/`
2. Implement utility functions in `/app/utils/`
3. Create API endpoints in `/server/api/` (consider NDJSON streaming for long operations)
4. Build UI components in `/app/components/`
5. Add comprehensive validation and fallbacks
6. Test locally with `npm run preview`
7. Test edge cases and error scenarios

### Debugging Issues

1. Check browser console for client-side errors
2. Review server logs in Cloudflare Workers dashboard
3. Validate API responses with external service status
4. Test with various input combinations and edge cases
5. Verify fallback behaviour during external API failures

### Performance Optimisation

1. Monitor statistics cache hit rates and fallback usage
2. Optimise batch processing and streaming performance
3. Minimise API calls to external services
4. Leverage Cloudflare Workers global distribution
5. Monitor memory usage during large simulations
6. Implement request cancellation for long-running operations

## 📊 Key Performance Metrics

- **Engagement**: Average session duration > 3 minutes
- **Feature Adoption**: ≥ 20% of users who generate tickets run simulations
- **Performance**: P95 API latency < 1500ms
- **Reliability**: API error rate < 0.1% with graceful fallbacks
- **Completion**: High success rate for Monte Carlo simulations

## 🎰 Responsible Gaming

- Clear disclaimers about educational/entertainment purpose
- No real-money transactions or gambling features
- Transparent pricing display (€2.00/line)
- Educational focus on understanding costs and probabilities

## 🤖 AI Assistant Guidelines

When working with this codebase:

1. **Understand the Context**: This is an educational simulation tool, not a gambling application
2. **Respect Constraints**: Always validate input limits (tickets: 1-500, simulations: 100-10,000)
3. **Implement Fallbacks**: External APIs can fail; ensure graceful degradation
4. **Optimise Performance**: Consider memory usage and response times for large operations
5. **Maintain Accuracy**: Use exact algorithms (B-ES) and proper normalization
6. **Test Thoroughly**: Verify uniqueness, proper weighting, and statistical accuracy
7. **Document Changes**: Update relevant documentation when modifying core logic

---

This guide provides the foundation for AI assistants to work effectively with the EuroJackpot Simulator codebase, ensuring consistency with project goals and technical requirements.
