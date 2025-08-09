# EuroJackpot Generator

EuroJackpot Generator is a web application that generates EuroJackpot numbers based on historical draw frequencies. It provides users with a simple interface to generate multiple system tickets and simulate prize extractions to identify winning tickets.

## Features

- **Generate Multiple System Tickets**: Create numerous tickets with customizable number combinations based on system types.
- **Simulate Prize Extraction**: Perform simulated draws to determine winning numbers.
- **Winning Class Identification**: Automatically identify and display the winning class for each ticket based on the simulation.
- **Highlight Winning Tickets**: Visually highlight winning tickets and their corresponding winning numbers.
- **Uses Historical Draw Frequencies**: Leverages historical data to generate numbers with weighted probabilities.
- **Responsive Design**: Optimized for both desktop and mobile devices.

## Technologies Used

- **Vue.js 3**
- **Nuxt 3**
- **TypeScript**
- **Tailwind CSS**
- **Cloudflare Pages** for deployment

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

## Environment Variables

The following environment variables can be configured:

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
# npm
npm run build

# pnpm
pnpm run build

# yarn
yarn build

# bun
bun run build
```

## Deployment

This project is configured to deploy on Cloudflare Pages. To deploy, run:

```bash
npm run deploy
```

## License

[MIT License](LICENSE)
