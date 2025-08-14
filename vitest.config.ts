import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '~',
        replacement: fileURLToPath(new URL('./app', import.meta.url)),
      },
      {
        find: '@',
        replacement: fileURLToPath(new URL('./app', import.meta.url)),
      },
      {
        find: '~~',
        replacement: fileURLToPath(new URL('.', import.meta.url)),
      },
      {
        find: '@@',
        replacement: fileURLToPath(new URL('.', import.meta.url)),
      },
    ],
  },
})
