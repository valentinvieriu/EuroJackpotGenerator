import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    threads: false,
  },
  resolve: {
    alias: {
      // Nuxt-style aliases: map to app source dir
      '~': resolve(rootDir, 'app'),
      '@': resolve(rootDir, 'app'),
    },
  },
})
