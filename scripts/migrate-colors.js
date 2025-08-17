#!/usr/bin/env node

/**
 * 🎲 Casino Theme Migration Script
 * Automatically migrates Tailwind CSS colors from old config to new semantic tokens
 */

import fs from 'node:fs'
import path from 'node:path'
import { glob } from 'glob'

// Color mapping from old classes to new semantic tokens
/* eslint-disable no-restricted-syntax */
const COLOR_MAPPINGS = {
  // Background colors
  'bg-casino-blue': 'bg-surface-primary',
  'bg-casino-blue-light': 'bg-surface-secondary',
  'bg-casino-blue-dark': 'bg-surface-tertiary',
  'bg-casino-gold': 'bg-brand-gold',
  'bg-casino-gold-light': 'bg-brand-gold-light',
  'bg-casino-gold-dark': 'bg-brand-gold-dark',
  'bg-vip-orange': 'bg-interactive-primary',
  'bg-vip-orange-light': 'bg-interactive-primary-light',
  'bg-vip-orange-dark': 'bg-interactive-primary-hover',
  'bg-ball-yellow': 'bg-ball-primary',
  'bg-star-gold': 'bg-star-primary',
  'bg-navy-muted': 'bg-surface-secondary',

  // Text colors
  'text-ivory': 'text-content-primary',
  'text-casino-gold': 'text-brand-gold',
  'text-casino-gold-light': 'text-brand-gold-light',
  'text-casino-gold-dark': 'text-brand-gold-dark',
  'text-vip-orange': 'text-interactive-primary',
  'text-ball-yellow': 'text-ball-primary',
  'text-star-gold': 'text-star-primary',

  // Border colors
  'border-casino-gold': 'border-border-primary',
  'border-casino-gold-light': 'border-brand-gold-light',
  'border-casino-gold-dark': 'border-brand-gold-dark',
  'border-vip-orange': 'border-border-focus',
  'border-navy-muted': 'border-border-secondary',

  // Common default colors → semantic alternatives
  'bg-gray-100': 'bg-surface-secondary',
  'bg-gray-200': 'bg-surface-card',
  'bg-gray-800': 'bg-surface-primary',
  'bg-gray-900': 'bg-surface-tertiary',
  'bg-gray-600': 'bg-surface-tertiary',
  'bg-gray-700': 'bg-surface-tertiary',
  'bg-gray-400': 'bg-surface-elevated-2',
  'bg-gray-500': 'bg-surface-elevated-2',
  'text-gray-100': 'text-content-primary',
  'text-gray-200': 'text-content-secondary',
  'text-gray-300': 'text-content-secondary',
  'text-gray-400': 'text-content-muted',
  'text-gray-500': 'text-content-muted',
  'text-white': 'text-content-primary',
  'text-yellow-400': 'text-brand-gold-400',
  'text-green-400': 'text-premium-emerald-400',
  'text-blue-400': 'text-premium-sapphire-400',
  'text-red-400': 'text-error',
  'text-red-300': 'text-error-light',
  'text-green-300': 'text-success-light',
  'text-yellow-300': 'text-warning-light',
  'border-gray-200': 'border-border-secondary',
  'border-gray-300': 'border-border-muted',

  // Gradient colors
  'from-casino-blue': 'from-surface-primary',
  'to-casino-blue': 'to-surface-primary',
  'from-casino-blue-light': 'from-surface-secondary',
  'to-casino-blue-light': 'to-surface-secondary',
  'from-casino-gold': 'from-brand-gold-400',
  'to-casino-gold': 'to-brand-gold-400',
  'from-casino-gold/20': 'from-brand-gold-400/20',
  'to-casino-gold-light/20': 'to-brand-gold-200/20',
  'from-vip-orange': 'from-interactive-primary',
  'to-vip-orange': 'to-interactive-primary',
  'from-vip-orange-light': 'from-interactive-primary-light',
  'to-vip-orange-light': 'to-interactive-primary-light',

  // Hover states
  'hover:bg-casino-blue-light': 'hover:bg-surface-card-hover',
  'hover:bg-casino-gold': 'hover:bg-brand-gold-400',
  'hover:bg-vip-orange-dark': 'hover:bg-interactive-primary-hover',
  'hover:text-casino-gold': 'hover:text-brand-gold-400',
  'hover:from-vip-orange-light': 'hover:from-interactive-primary-light',

  // Focus and ring colors
  'ring-vip-orange': 'ring-interactive-primary',
  'ring-casino-gold': 'ring-brand-gold-400',
  'ring-offset-casino-blue-dark': 'ring-offset-surface-primary',

  // Missing surface variants
  'to-surface-primary-light': 'to-surface-secondary',
  'from-surface-primary-light': 'from-surface-secondary',
}

// File patterns to search
const FILE_PATTERNS = [
  'app/components/**/*.vue',
  'app/pages/**/*.vue',
  'app/layouts/**/*.vue',
  'app/utils/**/*.ts',
  'app/**/*.vue',
  'app/**/*.ts',
]

// Files to exclude
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.nuxt/**',
  '**/coverage/**',
]

/**
 * Scan files for color usage
 */
async function scanFiles() {
  console.log('🔍 Scanning files for color usage...\n')

  const files = await glob(FILE_PATTERNS, {
    ignore: EXCLUDE_PATTERNS,
    absolute: true,
  })

  const results = []
  let totalIssues = 0

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8')
    const relativePath = path.relative(process.cwd(), filePath)
    const lines = content.split('\n')
    const fileIssues = []

    lines.forEach((line, index) => {
      Object.keys(COLOR_MAPPINGS).forEach((oldColor) => {
        if (line.includes(oldColor)) {
          fileIssues.push({
            line: index + 1,
            oldColor,
            newColor: COLOR_MAPPINGS[oldColor],
            content: line.trim(),
          })
          totalIssues++
        }
      })
    })

    if (fileIssues.length > 0) {
      results.push({
        file: relativePath,
        issues: fileIssues,
      })
    }
  }

  return { results, totalIssues }
}

/**
 * Generate migration report
 */
function generateReport(scanResults) {
  const { results, totalIssues } = scanResults

  console.log(`📊 Migration Report`)
  console.log(`${'='.repeat(50)}`)
  console.log(`Files affected: ${results.length}`)
  console.log(`Total color replacements needed: ${totalIssues}`)
  console.log('')

  results.forEach(({ file, issues }) => {
    console.log(`📁 ${file}`)
    console.log(
      `   ${issues.length} issue${issues.length === 1 ? '' : 's'} found`
    )

    issues.forEach(({ line, oldColor, newColor, content }) => {
      console.log(`   Line ${line}: ${oldColor} → ${newColor}`)
      console.log(
        `   ${content.slice(0, 80)}${content.length > 80 ? '...' : ''}`
      )
    })
    console.log('')
  })

  console.log('💡 Next Steps:')
  console.log('1. Review the mappings above')
  console.log('2. Run: node scripts/migrate-colors.js --fix')
  console.log('3. Test your components')
  console.log('4. Run: npm run lint')
}

/**
 * Apply automatic fixes
 */
async function applyFixes() {
  console.log('🔧 Applying automatic color migration...\n')

  const files = await glob(FILE_PATTERNS, {
    ignore: EXCLUDE_PATTERNS,
    absolute: true,
  })

  let filesModified = 0
  let totalReplacements = 0

  for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf8')
    let fileModified = false
    let fileReplacements = 0

    Object.entries(COLOR_MAPPINGS).forEach(([oldColor, newColor]) => {
      const regex = new RegExp(`\\b${oldColor}\\b`, 'g')
      const matches = content.match(regex)

      if (matches) {
        content = content.replace(regex, newColor)
        fileReplacements += matches.length
        fileModified = true
      }
    })

    if (fileModified) {
      fs.writeFileSync(filePath, content, 'utf8')
      filesModified++
      totalReplacements += fileReplacements

      const relativePath = path.relative(process.cwd(), filePath)
      console.log(`✅ ${relativePath} - ${fileReplacements} replacements`)
    }
  }

  console.log('')
  console.log(`🎉 Migration Complete!`)
  console.log(`Files modified: ${filesModified}`)
  console.log(`Total replacements: ${totalReplacements}`)
  console.log('')
  console.log('🔍 Next steps:')
  console.log('1. Review the changes: git diff')
  console.log('2. Test your application: npm run dev')
  console.log('3. Run linting: npm run lint')
  console.log('4. Run tests: npm test')
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  const shouldFix = args.includes('--fix') || args.includes('-f')

  console.log('🎲 Casino Theme Color Migration Tool')
  console.log('===================================\n')

  if (shouldFix) {
    await applyFixes()
  } else {
    const scanResults = await scanFiles()
    generateReport(scanResults)
  }
}

// Run the script
main().catch(console.error)
