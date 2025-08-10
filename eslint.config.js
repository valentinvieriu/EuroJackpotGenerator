import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import prettier from 'eslint-config-prettier'

export default createConfigForNuxt({
  features: {
    tooling: true,
    stylistic: false, // Disable stylistic rules to avoid conflicts with Prettier
  },
})
  .append(prettier)
  // Relax a few rules inside test files to keep tests concise
  .append({
    files: [
      '**/__tests__/**/*.{js,ts}',
      '**/*.{spec,test}.{js,ts}',
      'server/**/__tests__/**/*.{js,ts}',
    ],
    rules: {
      // Tests often mock external libs and use loosely-typed data
      '@typescript-eslint/no-explicit-any': 'off',
    },
  })
