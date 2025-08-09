# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EuroJackpot Generator is a Nuxt 4 + Vue 3 application that generates EuroJackpot lottery tickets using historical draw frequency data. The app is deployed as a Cloudflare Worker with a custom domain (eurojackpot.vv42.net).

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to Cloudflare Workers
npm run deploy

# Generate Cloudflare Worker types
npm run cf-typegen
```

## Architecture Overview

### Core Application Flow
1. **Client-side ticket generation**: User configures system tickets (5/50 + 2/12 format)
2. **API-based generation**: `/api/generate` endpoint creates tickets using weighted historical data
3. **Simulation engine**: `/api/simulate` performs prize draws and determines winning classes
4. **Statistics integration**: Live data from Lotto Bayern API powers number frequency weighting

### Key Components Structure

- **TicketGenerator.vue**: Main UI component handling user input, ticket generation, and simulation
- **Ticket.vue**: Individual ticket display with number highlighting
- **SimulationResult.vue**: Results display showing winnings and statistics

### Backend Architecture

**API Endpoints** (`/server/api/`):
- `generate.ts`: Creates tickets with validation (1-500 tickets, system combinations 5-16/2-12)
- `simulate.ts`: Performs lottery simulation and calculates winnings
- `fetchWinningData.ts`: Retrieves current winning odds from external API

**Utilities** (`/app/utils/`):
- `statisticsManager.ts`: Manages cached historical frequency data (10-minute cache)
- `numberGenerator.ts`: Weighted random number generation based on historical frequencies
- `winningManager.ts`: Determines winning classes and calculates prize amounts
- `ticketGenerator.ts`: Orchestrates ticket creation with unique combination validation

### Data Flow
1. `statisticsManager` fetches and caches frequency data from Lotto Bayern API
2. `numberGenerator` uses weighted probabilities for realistic number selection
3. `ticketGenerator` ensures unique ticket combinations within each generation batch
4. `winningManager` calculates potential winnings based on current prize pools

### Deployment Architecture

**Cloudflare Workers Configuration**:
- Custom preset in `./cloudflare-preset/`
- Nitro SSG with edge runtime
- Custom domain: `eurojackpot.vv42.net`
- Static assets served from `/dist/public`

### Type Definitions

**Core Types** (`/app/types/`):
- `ticket.ts`: Ticket structure with main/euro numbers and winning states
- `statistics.ts`: Historical frequency data structure
- `winning.ts`: Prize classes and turnover data from external APIs

## Development Notes

### Number Generation Logic
- Main numbers: 1-50 (select 5+ for system tickets)
- Euro numbers: 1-12 (select 2+ for system tickets)
- System tickets generate all possible combinations from selected numbers
- Weighted selection based on historical draw frequencies with 10-minute caching

### Validation Constraints
- Ticket count: 1-500 per generation
- Main numbers: 5-16 selections (system tickets)
- Euro numbers: 2-12 selections
- Comprehensive input validation on both client and server

### External Dependencies
- **Lotto Bayern API**: Real-time statistics and winning data
- **Tailwind CSS**: Custom casino-themed colour palette
- **Nuxt 4**: Latest framework features with Cloudflare Workers preset