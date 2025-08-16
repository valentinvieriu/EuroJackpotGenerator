# EuroJackpot Simulator

**Ever wondered how EuroJackpot system tickets really work?** This educational web application lets you explore the fascinating world of lottery mathematics through realistic simulations and detailed analytics.

## What Does This Do?

EuroJackpot Simulator helps you understand:

- **System Tickets**: How selecting more numbers affects your chances and costs
- **Real Probabilities**: What actually happens when you play different strategies
- **Cost vs. Benefit**: Whether system tickets are worth the extra expense
- **Monte Carlo Analysis**: See patterns emerge from thousands of simulated draws

## Why This Matters

Instead of guessing about lottery strategies, you can **see the data**. Run 10,000 simulations to understand what "1 in 95 million" really means in practice. Perfect for statistics students, curious players, or anyone who loves probability puzzles.

**⚠️ Educational Purpose Only**: This is a learning tool, not a prediction system. It won't help you win the lottery, but it will help you understand it.

## Features

### 🎫 System Ticket Generation

- Generate 1-500 unique tickets per batch
- System combinations (5/50 + 2/12 format) from 5-16 main and 2-12 Euro numbers
- Transparent €2.00 per line pricing with immediate cost calculation
- Multiple generation methods: random, historically weighted, or custom favorite numbers
- Visual favorite number selector for personalised ticket generation
- Individual ticket deletion with automatic recalculation
- Comprehensive frequency analysis with historical draw data visualisation
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

## How It Works

The simulator uses the official EuroJackpot format (5 numbers from 1-50, plus 2 Euro numbers from 1-12) and real win-class payouts to provide accurate simulations. Choose your system size, optionally select favorite numbers based on personal preference or frequency analysis, generate tickets, and run either single draws or large-scale Monte Carlo simulations to see the mathematics in action. Compare different strategies including random selection, weighted historical frequencies, and custom number preferences.

## Quick Start

1. **Try It Online**: Visit the live application [eurojackpot.vv42.workers.dev](https://eurojackpot.vv42.workers.dev)
1. **Run Locally**:
   ```bash
   npm install
   npm run dev  # Starts on localhost:3000
   ```
   For detailed setup, testing, and contribution guidelines, see [ai_docs/COMMON_GUIDE.md](ai_docs/COMMON_GUIDE.md)
1. **Understand the Code**: Review [ai_docs/ARCHITECTURE.md](ai_docs/ARCHITECTURE.md) for technical details

## Learn More

This project demonstrates several interesting concepts:

- **Probability Theory**: See how mathematical expectations play out in practice
- **System Tickets**: Understand the trade-offs between coverage and cost
- **Custom Strategies**: Compare random vs frequency-based vs favorite number approaches
- **Historical Analysis**: Explore draw frequency patterns and their impact on outcomes
- **Monte Carlo Methods**: Watch statistical patterns emerge from large samples
- **Web Performance**: Real-time streaming of long-running calculations

## Documentation

- **[Product Requirements](ai_docs/PRD.md)** - What we're building and why
- **[Architecture Guide](ai_docs/ARCHITECTURE.md)** - Technical implementation details
- **[Development Guide](ai_docs/COMMON_GUIDE.md)** - Setup, testing, and contribution guidelines

## Responsible Use

This simulator is designed for education and entertainment:

- No real-money transactions or gambling features
- Clear cost transparency (€2.00 per line, matching real EuroJackpot pricing)
- Educational focus on understanding probabilities and mathematics
- **Does not predict or guarantee real lottery outcomes**

## License

[MIT License](LICENSE)
