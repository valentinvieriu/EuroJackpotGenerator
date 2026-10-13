/**
 * Builds the Lotto Bayern bookmarklet into public/bookmarklet/ (git-ignored):
 *   lotto-bayern-bookmarklet.js       readable bundle, for review
 *   lotto-bayern-bookmarklet-url.txt  the javascript: URL the install page offers
 *
 * Runs before `nuxt dev` and `nuxt build` (see package.json), so the output
 * always matches the source.
 */
import { build } from 'esbuild'
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const sourceDir = path.join(root, 'bookmarklet/src')
const outputDir = path.join(root, 'public/bookmarklet')

// The panel is injected into someone else's page, so it cannot load the app's
// stylesheet. Instead, the theme tokens it uses are copied in at build time.
// A token that no longer exists fails the build rather than shipping a broken panel.
const theme = await readFile(
  path.join(root, 'app/assets/css/theme.css'),
  'utf8'
)
const panel = await readFile(path.join(sourceDir, 'panel.css'), 'utf8')
const tokens = new Map()
function addToken(name) {
  if (tokens.has(name)) return
  const match = theme.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))
  if (!match) {
    throw new Error(
      `bookmarklet/src/panel.css uses ${name}, which app/assets/css/theme.css no longer defines.`
    )
  }
  tokens.set(name, match[1].trim())
  for (const dependency of match[1].matchAll(/var\((--[\w-]+)/g))
    addToken(dependency[1])
}
for (const match of panel.matchAll(/var\((--[\w-]+)/g)) addToken(match[1])
const style = `:host{${[...tokens].map(([name, value]) => `${name}:${value};`).join('')}}\n${panel}`

const options = {
  absWorkingDir: root,
  entryPoints: [path.join(sourceDir, 'main.js')],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  write: false,
  // Same alias the app uses, so shared modules import the same way everywhere
  alias: { '~': path.join(root, 'app') },
  define: { __BOOKMARKLET_STYLE__: JSON.stringify(style) },
}
const readable = (await build(options)).outputFiles[0].text
const compact = (await build({ ...options, minify: true })).outputFiles[0].text
const bookmarkUrl = `javascript:${encodeURIComponent(`void function(){${compact}}()`)}`

// Start from an empty folder so nothing stale is ever served
await rm(outputDir, { recursive: true, force: true })
await mkdir(outputDir, { recursive: true })
await writeFile(path.join(outputDir, 'lotto-bayern-bookmarklet.js'), readable)
await writeFile(
  path.join(outputDir, 'lotto-bayern-bookmarklet-url.txt'),
  `${bookmarkUrl}\n`
)
console.log(
  `Built bookmarklet (${bookmarkUrl.length} URL characters) in public/bookmarklet/`
)
