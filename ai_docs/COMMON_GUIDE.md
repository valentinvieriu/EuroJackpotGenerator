# EuroJackpot Simulator - LLM Development Guide

## Project Overview

**EuroJackpot Simulator** is a production educational lottery simulation application built with **Nuxt 4 + Vue 3**, deployed on **Cloudflare Workers**. This sophisticated codebase simulates EuroJackpot system tickets with Monte Carlo analysis for educational purposes.

**Key Capabilities**: Complex refactoring, performance optimization, advanced TypeScript patterns, architectural decisions, debugging edge cases, and implementing mathematical algorithms.

## Technology Stack

**Frontend**: Nuxt 4, Vue 3 Composition API, TypeScript, Pinia state management  
**Backend**: Cloudflare Workers with Nitro, NDJSON streaming  
**Quality**: Zod validation, Vitest testing, ESLint/Prettier
**UX Enhancement**: Web Audio API, Canvas animations, Web Workers

## Core Architectural Principles

1. **Constants Management**: All values in `app/utils/constants.ts` - never hardcode
1. **Server-Side Security**: Ticket generation in `/server/api/generate` only
1. **3-Layer State**: URL persistence → Pinia stores → SSR-safe state (see [ARCHITECTURE.md](./ARCHITECTURE.md))
1. **Thin Components**: UI only, business logic in Pinia stores
1. **Logic Testing**: Test business logic, not UI rendering

_For detailed architectural information, see [ARCHITECTURE.md](./ARCHITECTURE.md)_

## Quick Start

### Development Setup

```bash
npm install
npm run dev  # Starts on localhost:3000
```

### Key Commands

```bash
npm test         # Run tests
npm run lint     # Check code quality
npm run format   # Format code
```

### Understanding the Codebase

1. **Dual-Mode Architecture**: Simple mode for quick start, custom mode for advanced configuration with progressive disclosure
1. **State Management**: 3-layer architecture (URL → Pinia → SSR-safe) with mode state and favorite numbers persistence
1. **Business Logic**: Located in `stores/` and `app/utils/` including custom number generation algorithms and popularity scoring
1. **API Endpoints**: Server logic in `server/api/` including frequency analysis endpoints
1. **Component Patterns**: Hero section with stepper, overlay modals, accordion UI, visual selectors, deletion handlers with state cleanup, mode transitions (see [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for styling standards)
1. **Animation Systems**: Canvas-based background animations (`BouncingBallsCanvas.vue`) with Web Worker optimization and audio feedback (`audioUtils.ts`)
1. **Testing**: Focus on business logic, not UI rendering or animation performance

_For detailed patterns and examples, see [ARCHITECTURE.md](./ARCHITECTURE.md)_

## Development Standards

### Code Quality

- **Linting**: ESLint enforced via pre-commit hooks
- **Formatting**: Prettier with consistent styling
- **Workflow**: Always run `npm run format` and `npm run lint` before committing

### Testing Philosophy

- **Test**: Business logic in stores, utilities, server endpoints, Zod schemas, favorite number algorithms, deletion state handling
- **Don't Test**: UI rendering, CSS, simple event handlers, accordion animations, canvas animations, audio synthesis
- **Requirement**: New features must include business logic tests including edge cases for state cleanup

### Styling Standards

- **Token-First Approach**: Use design system tokens exclusively, never hardcode colours, spacing, or typography
- **Semantic Naming**: Apply role-based styling (surface, content, interactive) rather than appearance-based classes
- **Accessibility Compliance**: Ensure contrast ratios, focus management, and reduced-motion preferences
- **SSR-Safe Styling**: Avoid runtime-computed styles that cause hydration mismatches

_For detailed testing strategies and examples, see testing sections in [ARCHITECTURE.md](./ARCHITECTURE.md)_

## Development Workflows

### Feature Development Pattern

1. **Schema First**: Define Zod schemas in `app/schemas/` (including URL config for new state and mode definitions)
1. **Constants**: Add values to `app/utils/constants.ts` (never hardcode, includes simple mode configuration)
1. **Business Logic**: Implement in Pinia stores with tests (including state cleanup patterns and mode management)
1. **API Layer**: Create server endpoints with validation
1. **UI Components**: Thin presentation layer only (hero section with stepper, overlay modals, accordion patterns, deletion handlers, mode transitions)
1. **Design System Integration**: Apply design system tokens, accessibility standards, and semantic styling patterns to all UI components
1. **Animation & Audio**: Add canvas animations and audio feedback without blocking core functionality (Web Workers for performance)
1. **Quality Check**: Run tests, lint, and format before completion

### Debugging Approach

1. **Identify Layer**: URL state vs Pinia stores vs UI state
1. **Test-Driven**: Write failing test to reproduce issue
1. **Isolate & Fix**: Use watch mode for rapid feedback
1. **Verify**: Ensure fix doesn't introduce regressions

_For detailed workflow examples and best practices, see development sections in [ARCHITECTURE.md](./ARCHITECTURE.md)_
