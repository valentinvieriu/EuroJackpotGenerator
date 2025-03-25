export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  css: ['assets/css/tailwind.css'],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api'
    }
  },

  app: {
    head: {
      title: 'EuroJackpot Generator',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { hid: 'description', name: 'description', content: 'Generate EuroJackpot numbers based on historical draw frequencies.' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },

  nitro: {
    preset: "./cloudflare-preset"
  },

  compatibilityDate: '2024-10-01'
})