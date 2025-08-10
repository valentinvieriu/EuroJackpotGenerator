# EuroJackpot Simulator

EuroJackpot Simulator is an educational web application that helps users understand EuroJackpot system tickets through realistic simulations. Built with Nuxt 4 and Vue 3, it provides single draw simulations and comprehensive Monte Carlo analysis with detailed analytics.

**⚠️ Educational Purpose Only**: This application is for educational and entertainment purposes. It does not predict real lottery draws or guarantee any outcomes.

## Features

### 🎫 System Ticket Generation
- Generate 1-500 unique tickets per batch
- System combinations (5/50 + 2/12 format) from 5-16 main and 2-12 Euro numbers
- Transparent €2.00 per line pricing with immediate cost calculation
- Historically weighted number selection based on draw frequencies
- Efraimidis-Spirakis algorithm for exact weighted sampling without replacement

### 🎯 Single Draw Simulation
- Immediate mock draw with match highlighting
- Real-time ROI and net profit calculation
- Visual highlighting of winning numbers across all tickets
- Win class identification (Classes 1-12)

### 📊 Monte Carlo Simulation
- Large-scale simulations (100-10,000 draws)
- Real-time progress streaming with NDJSON
- Comprehensive analytics: distributions, percentiles, profitability rates
- Detailed statistics: mean, median, standard deviation, p25/p75/p95
- Optional JSON export of detailed results
- Cancellation support for long-running operations

### 🛡️ Reliability & Performance
- Graceful fallbacks for external API failures
- 10-minute caching for statistics data
- Edge deployment on Cloudflare Workers
- Responsive design optimised for desktop and mobile

## Technologies Used

- **Nuxt 4** - Latest framework with enhanced performance
- **Vue 3** - Composition API for modern component development
- **TypeScript** - Type-safe development with comprehensive validation
- **Tailwind CSS** - Casino-themed styling with custom colour palette
- **Cloudflare Workers** - Serverless edge deployment with Nitro
- **NDJSON Streaming** - Real-time progress updates for long operations

## Setup

Make sure to install the dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## API Endpoints

- `GET /api/generate` - Generate system tickets (1-500)
- `GET /api/simulate` - Single draw simulation
- `GET /api/batchSimulate` - Monte Carlo simulation with streaming
- `GET /api/fetchWinningData` - Current win class payouts

## Environment Variables

Optional configuration:

- `NUXT_PUBLIC_API_BASE` - Base URL for API endpoints (default: `/api`)

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm run dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

## Deployment

This project is configured for Cloudflare Workers deployment:

```bash
# Deploy to production
npm run deploy

# Generate Cloudflare Worker types
npm run cf-typegen
```

## Architecture

- **Frontend**: Nuxt 4 SPA with Vue 3 Composition API
- **Backend**: Nitro serverless API on Cloudflare Workers
- **External APIs**: Lotto Bayern for statistics and payout data
- **Caching**: 10-minute cache for external data with fallbacks
- **Streaming**: NDJSON for real-time Monte Carlo progress

## Performance Targets

- P95 API latency < 1500ms
- Monte Carlo simulations with real-time progress
- Error rate < 0.1% with graceful fallbacks
- Global edge deployment for optimal performance

## Responsible Gaming

This application is designed for educational and entertainment purposes only:
- No real-money transactions
- Clear cost transparency (€2.00 per line)
- Educational focus on understanding probabilities
- Does not predict or guarantee real lottery outcomes

## License

[MIT License](LICENSE)
