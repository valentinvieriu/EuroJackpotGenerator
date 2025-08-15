export default defineNuxtConfig({
  // Align aliases so ~ and @ point to the app directory, and ~~ and @@ to the project root
  srcDir: 'app',
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],

  pinia: {
    storesDirs: ['./stores/**'], // Auto-import stores from root stores directory
  },

  app: {
    head: {
      title: 'EuroJackpot Generator',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          hid: 'description',
          name: 'description',
          content:
            'Generate EuroJackpot numbers based on historical draw frequencies.',
        },
      ],
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    },
  },
  css: ['~/assets/css/tailwind.css'],

  runtimeConfig: {
    // Server-only configuration
    logLevel:
      process.env.LOG_LEVEL ||
      (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
      // Client-accessible logging configuration
      logLevel:
        process.env.NUXT_PUBLIC_LOG_LEVEL ||
        (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    },
  },
  experimental: {
    // Prevent duplicate registration warnings for Nuxt's internal route middleware in dev
    clientRouteRules: false,
  },
  routeRules: {
    // Global security headers
    // '/**': {
    //   headers: {
    //     'Content-Security-Policy':
    //       "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests; block-all-mixed-content",
    //     'Referrer-Policy': 'strict-origin-when-cross-origin',
    //     'X-Content-Type-Options': 'nosniff',
    //     'X-Frame-Options': 'DENY',
    //     'Permissions-Policy':
    //       'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    //   },
    // },

    // External odds endpoint is semi-static → cache at edge
    '/api/fetchWinningData': {
      headers: {
        'Cache-Control':
          'public, max-age=0, s-maxage=600, stale-while-revalidate=60',
      },
    },

    // Pure compute endpoints → no-store
    '/api/generate': { headers: { 'Cache-Control': 'no-store' } },
    '/api/simulate': { headers: { 'Cache-Control': 'no-store' } },

    // Streaming: avoid proxy transformations that can buffer
    '/api/batchSimulate': {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  },
  compatibilityDate: '2024-10-01',

  nitro: {
    preset: './cloudflare-preset',
  },
})
