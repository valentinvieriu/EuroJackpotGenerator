import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import prettier from 'eslint-config-prettier'

export default createConfigForNuxt({
  features: {
    tooling: true,
    stylistic: false, // Disable stylistic rules to avoid conflicts with Prettier
  },
}).append(prettier)
