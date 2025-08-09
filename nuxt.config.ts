export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],

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
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
    },
  },
  experimental: {
    // Prevent duplicate registration warnings for Nuxt's internal route middleware in dev
    clientRouteRules: false,
  },

  compatibilityDate: '2024-10-01',

  nitro: {
    preset: './cloudflare-preset',
  },
})
