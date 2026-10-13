import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  // Align aliases so ~ and @ point to the app directory, and ~~ and @@ to the project root
  srcDir: 'app',
  modules: ['@pinia/nuxt'],

  pinia: {
    storesDirs: ['./stores/**'], // Auto-import stores from root stores directory
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      sourcemap: false,
    },
  },

  app: {
    head: {
      title: 'EuroJackpot Generator',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Generate EuroJackpot numbers based on historical draw frequencies.',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600..800&family=Inter:wght@400..700&family=JetBrains+Mono:wght@600..700&family=Oswald:wght@500..700&display=swap',
        },
      ],
    },
  },
  css: ['~/assets/css/theme.css'],

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
    // Security headers on every response.
    // There is deliberately no Content-Security-Policy here: Nuxt inlines its
    // hydration payload, so a policy needs per-request nonces or hashes (for
    // example via the nuxt-security module). A static one would break the app.
    '/**': {
      headers: {
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },

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
  },
  compatibilityDate: '2024-10-01',

  nitro: {
    preset: './cloudflare-preset',
  },
})
