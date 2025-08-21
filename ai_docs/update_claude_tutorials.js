#!/usr/bin/env node
/**
 * Update Claude Code Fresh Tutorials Script
 * Scrapes the Claude Code overview page, pulls sidebar links (first group),
 * tries to download their Markdown (.md). If no .md exists, it falls back to
 * grabbing the page's <main> HTML and lightly converts it to Markdown.
 *
 * Node: v24+ (no dependencies)
 */

import { writeFile, readFile, access, mkdir, rename } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// -------------------------------
// Configuration
// -------------------------------
const DOCS_BASE_URL = 'https://docs.anthropic.com/en/docs/claude-code'
const OVERVIEW_URL = `${DOCS_BASE_URL}/overview`
const OUTPUT_FILE = 'claude_code_fresh_tutorials.md'

// polite delay between requests (ms)
const REQUEST_DELAY_MS = 200

// -------------------------------
// Setup (resolve __dirname for ESM)
// -------------------------------
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// -------------------------------
// Colors + Logger
// -------------------------------
const colors = {
  RED: '\x1B[31m',
  GREEN: '\x1B[32m',
  YELLOW: '\x1B[33m',
  BLUE: '\x1B[34m',
  NC: '\x1B[0m',
}

const log = {
  info: (msg) => console.log(`${colors.BLUE}[INFO]${colors.NC} ${msg}`),
  success: (msg) => console.log(`${colors.GREEN}[SUCCESS]${colors.NC} ${msg}`),
  warning: (msg) => console.log(`${colors.YELLOW}[WARNING]${colors.NC} ${msg}`),
  error: (msg) => console.log(`${colors.RED}[ERROR]${colors.NC} ${msg}`),
}

// -------------------------------
// Helpers
// -------------------------------
const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

function uniquePreserveOrder(arr) {
  const seen = new Set()
  const out = []
  for (const it of arr) {
    if (!seen.has(it)) {
      seen.add(it)
      out.push(it)
    }
  }
  return out
}

function toAbsoluteDocsUrl(href) {
  try {
    if (href.startsWith('https://')) return href
    if (href.startsWith('/en/docs/claude-code/'))
      return `https://docs.anthropic.com${href}`
    // relative link under the docs base
    return `${DOCS_BASE_URL}/${href.replace(/^\/+/, '')}`
  } catch {
    return href
  }
}

function stripAnchorAndTrailingSlash(url) {
  try {
    const u = new URL(url)
    u.hash = ''
    // normalize trailing slash (keep no trailing slash)
    if (u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1)
    return u.toString()
  } catch {
    return url
  }
}

// very small HTML->Markdown "lite" (only if .md isn't available)
function htmlToMarkdownLite(html) {
  // remove scripts/styles
  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')

  // anchor tags -> "text (url)"
  html = html.replace(
    /<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, text) => {
      const cleanText = text.replace(/<[^>]+>/g, '').trim()
      return `${cleanText} (${href})`
    }
  )

  // headings
  html = html.replace(
    /<h1[^>]*>([\s\S]*?)<\/h1>/gi,
    (_, t) => `# ${t.replace(/<[^>]+>/g, '').trim()}\n\n`
  )
  html = html.replace(
    /<h2[^>]*>([\s\S]*?)<\/h2>/gi,
    (_, t) => `## ${t.replace(/<[^>]+>/g, '').trim()}\n\n`
  )
  html = html.replace(
    /<h3[^>]*>([\s\S]*?)<\/h3>/gi,
    (_, t) => `### ${t.replace(/<[^>]+>/g, '').trim()}\n\n`
  )
  html = html.replace(
    /<h4[^>]*>([\s\S]*?)<\/h4>/gi,
    (_, t) => `#### ${t.replace(/<[^>]+>/g, '').trim()}\n\n`
  )

  // code blocks
  html = html.replace(
    /<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_, code) => {
      // unescape minimal entities
      const c = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
      return '```\n' + c.trim() + '\n```\n\n'
    }
  )
  // inline code
  html = html.replace(
    /<code[^>]*>([\s\S]*?)<\/code>/gi,
    (_, code) => '`' + code.replace(/<[^>]+>/g, '').trim() + '`'
  )

  // lists
  html = html.replace(
    /<li[^>]*>([\s\S]*?)<\/li>/gi,
    (_, t) => `- ${t.replace(/<[^>]+>/g, '').trim()}\n`
  )
  html = html.replace(/<\/ul>|<\/ol>/gi, '\n')

  // paragraphs/line breaks
  html = html.replace(/<br\s*\/?>/gi, '\n')
  html = html.replace(
    /<p[^>]*>([\s\S]*?)<\/p>/gi,
    (_, t) => `${t.replace(/<[^>]+>/g, '').trim()}\n\n`
  )

  // collapse leftover tags
  html = html.replace(/<[^>]+>/g, '')
  // normalize whitespace
  return html.replace(/\n{3,}/g, '\n\n').trim()
}

async function ensureOutputDir(filePath) {
  const dir = path.dirname(
    path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath)
  )
  await mkdir(dir, { recursive: true })
  return dir
}

async function backupIfExists(filePath) {
  try {
    await access(filePath)
  } catch {
    return null // doesn't exist
  }
  const { dir, name, ext } = path.parse(filePath)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(dir, `${name}.${stamp}.bak${ext || ''}`)
  await rename(filePath, backupPath)
  return backupPath
}

// -------------------------------
/** Fetch text (HTML or MD) from a URL with a friendly UA. */
// -------------------------------
async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'docs-scraper/1.0 (friendly; node)',
      Accept: 'text/html, text/plain; q=0.9, */*;q=0.8',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

// -------------------------------
// Extract links from the FIRST sidebar group
// -------------------------------
function extractSidebarLinks(htmlContent) {
  log.info('Extracting sidebar links (first sidebar group)...')

  // try explicit id first
  let groupMatch = htmlContent.match(
    /<ul[^>]*id=["']sidebar-group["'][^>]*>([\s\S]*?)<\/ul>/i
  )

  // fallback: look for the first sidebar-like <ul> that contains claude-code links
  if (!groupMatch) {
    const ulMatches = [...htmlContent.matchAll(/<ul[^>]*>([\s\S]*?)<\/ul>/gi)]
    groupMatch = ulMatches.find((m) =>
      /href="[^"]*\/en\/docs\/claude-code\//i.test(m[1])
    )
  }

  if (!groupMatch) {
    log.warning(
      'Could not find a clear "first sidebar group"; falling back to scanning entire page.'
    )
    // final fallback: scan whole page; match href values then filter to avoid overlapping quantifiers
    const allLinks = [...htmlContent.matchAll(/href="([^"]+)"/gi)]
      .map((m) => m[1])
      .filter((u) => /\/en\/docs\/claude-code\//i.test(u))
    const abs = uniquePreserveOrder(
      allLinks.map(toAbsoluteDocsUrl).map(stripAnchorAndTrailingSlash)
    )
    log.info(`Found ${abs.length} candidate links via fallback scan`)
    return abs
  }

  const firstGroupHtml = groupMatch[1]
  const links = [
    ...firstGroupHtml.matchAll(/href="([^"]*claude-code[^"]*)"/gi),
  ].map((m) => m[1])
  const abs = uniquePreserveOrder(
    links.map(toAbsoluteDocsUrl).map(stripAnchorAndTrailingSlash)
  )

  log.info(`Found ${abs.length} unique links in first sidebar group`)
  return abs
}

// -------------------------------
// Try to fetch .md; if unavailable, fallback to HTML -> MD-lite
// -------------------------------
async function fetchMarkdownFor(url) {
  const markdownUrl = `${url}.md`
  try {
    log.info(`Fetching MD: ${markdownUrl}`)
    const mdText = await fetchText(markdownUrl)
    const filename = path.basename(url)
    log.success(`Downloaded MD (${mdText.length} bytes) from ${filename}`)
    return { filename, content: mdText }
  } catch (e) {
    log.warning(`No MD found (${e.message}). Falling back to HTML for: ${url}`)
    try {
      const html = await fetchText(url)
      // try to grab <main> … </main> or <article> … </article>
      const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
        html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || [null, html]

      const mdLite = htmlToMarkdownLite(mainMatch[1] || '')
      const filename = path.basename(url)
      log.success(
        `Converted HTML -> MD-lite (${mdLite.length} bytes) from ${filename}`
      )
      return {
        filename,
        content: `> **Note:** This section was converted from HTML because \`.md\` was not available for this page.\n\n${mdLite}`,
      }
    } catch (err) {
      log.warning(`Failed HTML fallback for ${url}: ${err.message}`)
      return null
    }
  }
}

// -------------------------------
// Assemble final file
// -------------------------------
async function createTutorialFile(markdownFiles, outputFile) {
  log.info('Assembling final tutorial file...')
  await ensureOutputDir(outputFile)

  const header = `# Claude Code Fresh Tutorials

> **Auto-generated documentation**  
> This file was automatically generated from the official Claude Code documentation.  
> Last updated: ${new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })}
> Source: ${DOCS_BASE_URL}

---

`

  let finalContent = header
  for (const file of markdownFiles) {
    if (file && file.content) {
      log.info(`Adding: ${file.filename}`)
      finalContent += `\n<!-- Source: ${file.filename} -->\n\n`
      finalContent += file.content.trim()
      finalContent += '\n\n---\n\n'
    }
  }

  const backupPath = await backupIfExists(outputFile)
  await writeFile(outputFile, finalContent + '\n', 'utf8')

  const stats = await readFile(outputFile, 'utf8')
  log.success(`Wrote ${OUTPUT_FILE} (${stats.length} bytes)`)
  if (backupPath) log.info(`Previous version backed up to: ${backupPath}`)
}

// -------------------------------
// Main
// -------------------------------
async function main() {
  try {
    log.info('Starting Claude Code documentation update...')
    log.info(`Overview: ${OVERVIEW_URL}`)

    // 1) Download overview HTML
    const overviewHTML = await fetchText(OVERVIEW_URL)
    log.success('Downloaded overview page HTML')

    // 2) Extract sidebar links (first group preferred)
    const links = extractSidebarLinks(overviewHTML)

    if (!links.length) {
      log.error('No links found. The page structure may have changed.')
      process.exit(1)
    }

    // 3) Sequentially download each page (polite & simple)
    const markdownFiles = []
    for (const url of links) {
      const result = await fetchMarkdownFor(url)
      if (result) markdownFiles.push(result)
      await sleep(REQUEST_DELAY_MS)
    }

    const successCount = markdownFiles.length
    log.info(`Successfully collected ${successCount} of ${links.length} pages`)
    if (successCount === 0) {
      log.error('No pages were successfully downloaded.')
      process.exit(1)
    }

    // 4) Create the final tutorial file
    await createTutorialFile(markdownFiles, OUTPUT_FILE)

    log.success('Tutorial file updated successfully!')
    log.success(`Output file: ${OUTPUT_FILE}`)
    log.success(`Pages included: ${successCount}`)
  } catch (error) {
    log.error(`Script failed: ${error.message}`)
    process.exit(1)
  }
}

main()
