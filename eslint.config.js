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
  // Custom rules for casino theme - detect default Tailwind color usage
  .append({
    files: ['**/*.vue', '**/*.ts', '**/*.js'],
    rules: {
      // Ban default Tailwind colors - only allow our semantic tokens
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Literal[value=/\\b(bg|text|border|from|to|via|ring|shadow|fill|stroke|accent|caret|decoration|divide|outline|placeholder)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|gray|grey|slate|zinc|neutral|stone)(-[0-9]{1,2}|50|100|200|300|400|500|600|700|800|900|950)?\\b/]',
          message:
            '🎲 Default Tailwind colors are banned. Use semantic tokens instead: surface-*, content-*, brand-*, interactive-*, accent-*, ball-*, star-*, border-*, success, warning, error, info',
        },
        {
          selector:
            'TemplateElement[value.cooked=/\\b(bg|text|border|from|to|via|ring|shadow|fill|stroke|accent|caret|decoration|divide|outline|placeholder)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|gray|grey|slate|zinc|neutral|stone)(-[0-9]{1,2}|50|100|200|300|400|500|600|700|800|900|950)?\\b/]',
          message:
            '🎲 Default Tailwind colors are banned. Use semantic tokens instead: surface-*, content-*, brand-*, interactive-*, accent-*, ball-*, star-*, border-*, success, warning, error, info',
        },
      ],
    },
  })
