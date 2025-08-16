# EuroJackpot Simulator - Product Requirements

## Overview

EuroJackpot Simulator is an educational web application that demonstrates lottery mathematics through realistic simulations. Users can explore EuroJackpot **system tickets** (5/50 + 2/12 format), run single mock draws, or execute large-scale Monte Carlo simulations to understand costs, potential winnings, ROI, and statistical distributions.

The application uses official win-class structures and optionally incorporates historically weighted number generation for educational authenticity. This is strictly an **educational tool** that does not predict real draws or encourage gambling.

## Problem Statement

Most lottery players lack intuitive understanding of system ticket mathematics and long-term expected outcomes. Without hands-on simulation tools, it's difficult to grasp concepts like:

- How system ticket coverage affects both costs and winning probabilities
- The relationship between mathematical expectation and real-world variance
- Why "lucky number" strategies perform similarly to random selection over time
- The true cost-benefit analysis of different system sizes

## Objectives

- **Educate** users about lottery mathematics through interactive simulations
- **Demonstrate** the relationship between system ticket size, cost, and expected outcomes
- **Provide** fast, responsive Monte Carlo analysis with real-time progress
- **Ensure** reliability through graceful fallbacks and comprehensive error handling
- **Promote** responsible understanding with clear educational disclaimers

## User Experience

### Target Users

- **Statistics Students**: Exploring probability theory and Monte Carlo methods
- **Curious Players**: Understanding system ticket costs and typical outcomes
- **Data Enthusiasts**: Comparing strategies and observing statistical patterns
- **Educators**: Demonstrating mathematical concepts with real-world examples

### Key User Journeys

1. **Quick Exploration**: Generate system tickets → Run single draw → See immediate ROI
1. **Strategy Comparison**: Generate different system sizes → Compare costs and coverage
1. **Statistical Analysis**: Run 1000+ simulations → Analyze distributions and percentiles
1. **Reproducible Research**: Share specific configurations via URLs with seeds

### Core Scenarios

**Scenario 1: Understanding System Tickets**
User selects different system presets (5/2 vs 7/3), generates tickets, and immediately sees total cost breakdown. A single mock draw highlights matches and calculates winnings with clear ROI display.

**Scenario 2: Monte Carlo Analysis**  
User configures 100-10,000 simulations with real-time progress streaming. Final report shows comprehensive statistics: total costs, winnings, net results, win-class distributions, percentiles, and profitability rates.

## Functional Requirements

### Core Features

**Ticket Generation**

- Support system presets with 5-16 main numbers and 2-12 Euro numbers
- Generate 1-500 unique tickets per request with transparent €2.00/line pricing
- Offer uniform random or historically-weighted generation methods
- Provide immediate cost calculation and ticket display

**Single Draw Simulation**

- Generate realistic winning numbers (5 main + 2 Euro)
- Highlight matches across all tickets with visual clarity
- Calculate total winnings using official win-class payouts
- Display net profit/loss and ROI percentage

**Monte Carlo Simulation**

- Configure 100-10,000 simulations with customizable batch sizes
- Stream real-time progress via NDJSON with partial statistics
- Generate comprehensive final reports with distributions and percentiles
- Support cancellation and optional detailed result export (JSON)

### Configuration & Persistence

**State Management**

- Immediate URL synchronization for zero state loss on page refresh
- Shareable URLs for exact configuration reproduction
- Optional seed-based reproducibility for deterministic results
- Default high-quality randomness for typical usage

**Data Integration**

- Fetch current win-class payouts from Lotto Bayern API
- Cache statistics data with 10-minute expiration
- Graceful fallbacks for external API failures
- Historical frequency data for weighted number generation

## Non-Functional Requirements

### Performance

- P95 API latency < 1500ms under typical load
- Real-time Monte Carlo progress streaming to maintain UI responsiveness
- Efficient batch processing to prevent event loop blocking
- Global edge deployment for optimal performance

### Reliability

- < 0.1% API error rate with comprehensive fallback mechanisms
- Graceful handling of external API timeouts and data inconsistencies
- Robust error boundaries throughout the application stack
- Comprehensive input validation using Zod schemas

### Usability

- Responsive design optimized for desktop and mobile devices
- Clear visual hierarchy with intuitive navigation
- Accessibility support including keyboard navigation
- Immediate feedback for all user actions

### Security & Data

- No real-money transactions or payment processing
- No personal data collection or user accounts
- Client-side export functionality only (user-initiated)
- Secure server-side ticket generation to prevent manipulation

## Scope

### In Scope

- EuroJackpot system ticket simulation with official number ranges
- Single draw and Monte Carlo simulation capabilities
- Real-time progress streaming and comprehensive analytics
- Educational disclaimer and responsible gaming messaging
- Responsive web interface with mobile support

### Out of Scope

- Real-money gambling features or payment processing
- User accounts, authentication, or personal data storage
- Prediction algorithms or "guaranteed winning" strategies
- Historical draw lookup or date-specific analysis
- Social features or cloud-based result sharing

### Future Considerations

- Multi-language support and currency localization
- Additional lottery formats beyond EuroJackpot
- Advanced statistical analysis tools and visualizations
- Educational content and probability theory explanations

## Success Metrics

- **Engagement**: Average session duration > 3 minutes
- **Feature Adoption**: ≥ 20% of ticket generators run simulations
- **Completion Rate**: High percentage of Monte Carlo simulations finish successfully
- **Performance**: Maintain P95 latency targets under load
- **Reliability**: Achieve < 0.1% error rate with fallback utilization tracking

## Technical Constraints

### Platform Requirements

- **Framework**: Nuxt 4 with Vue 3 Composition API
- **Deployment**: Cloudflare Workers with Nitro serverless architecture
- **Browser Support**: Latest versions of Chrome, Firefox, Safari, Edge
- **External Dependencies**: Lotto Bayern public API for statistics and payouts

### System Limitations

- **Lottery Format**: EuroJackpot 5/50 + 2/12 exclusively
- **Pricing Model**: Fixed €2.00 per line matching official rates
- **Win Classes**: Support for official classes 1-12 with normalization
- **Simulation Scale**: Practical limits for memory and performance optimization

## Related Documentation

- **[Architecture Guide](./ARCHITECTURE.md)** - Technical implementation details and system design
- **[Development Guide](./COMMON_GUIDE.md)** - LLM integration guide and development workflows
