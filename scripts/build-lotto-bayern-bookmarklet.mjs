import { build } from 'esbuild'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const sourceDir = path.join(root, 'tools/lotto-bayern')
const outputDir = path.join(root, 'public/bookmarklet')
const theme = await readFile(
  path.join(root, 'app/assets/css/theme.css'),
  'utf8'
)
const panel = await readFile(path.join(sourceDir, 'panel.css'), 'utf8')
const tokens = new Map()
function addToken(name) {
  if (tokens.has(name)) return
  const match = theme.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))
  if (!match) throw new Error(`Unknown app theme token: ${name}`)
  tokens.set(name, match[1].trim())
  for (const dependency of match[1].matchAll(/var\((--[\w-]+)/g))
    addToken(dependency[1])
}
for (const match of panel.matchAll(/var\((--[\w-]+)/g)) addToken(match[1])
const style = `:host{${[...tokens].map(([name, value]) => `${name}:${value};`).join('')}}\n${panel}`

const options = {
  absWorkingDir: root,
  entryPoints: [path.join(sourceDir, 'bookmarklet.js')],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  write: false,
  define: { __BOOKMARKLET_STYLE__: JSON.stringify(style) },
}
const readable = (await build(options)).outputFiles[0].text
const compact = (await build({ ...options, minify: true })).outputFiles[0].text
const bookmarkUrl = `javascript:${encodeURIComponent(`void function(){${compact}}()`)}`
const escape = (value) =>
  value.replace(
    /[&<>"']/g,
    (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        ch
      ]
  )

await mkdir(outputDir, { recursive: true })
await writeFile(path.join(outputDir, 'lotto-bayern-bookmarklet.js'), readable)
await writeFile(
  path.join(outputDir, 'lotto-bayern-bookmarklet-url.txt'),
  `${bookmarkUrl}\n`
)
await writeFile(
  path.join(outputDir, 'install.html'),
  `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Install Lotto Bayern number filler</title>
<style>${style}
body{font:16px/1.6 system-ui;max-width:760px;margin:48px auto;padding:0 24px;background:var(--color-surface-primary-light);color:var(--color-content-primary)}
:root{${[...tokens].map(([name, value]) => `${name}:${value};`).join('')}}
a{color:var(--color-content-primary)}.bookmark{display:inline-block;padding:16px 22px;border-radius:10px;background:var(--color-interactive-primary);text-decoration:none;font-weight:700}textarea{width:100%;height:100px}
</style>
<h1>Lotto Bayern number filler</h1>
<p>This bookmarklet uses your Eurojackpot app’s server algorithms and fills the normal ticket form.</p>
<ol><li>Drag the link below onto your browser’s bookmarks bar.</li><li>Open <a href="https://www.lotto-bayern.de/eurojackpot/normalschein">Lotto Bayern’s Eurojackpot Normalschein</a> and click the bookmark.</li><li>Paste numbers or expand <strong>Generate using the app’s algorithms</strong>. Preview, then click <strong>Fill ticket fields</strong>.</li></ol>
<a class="bookmark" href="${escape(bookmarkUrl)}">Lotto Bayern · Fill numbers</a>
<h2>Four generation methods</h2>
<ul><li><strong>Uniform:</strong> unbiased random selection.</li><li><strong>Weighted:</strong> square-root historical frequencies, sampled without replacement.</li><li><strong>Favourites:</strong> your app’s favourite weighting and statistics fallback.</li><li><strong>Unpopular:</strong> the app’s candidate-ranking heuristic; not calibrated player popularity.</li></ul>
<p>Generation uses <code>/api/generate</code> on the app URL entered in the panel. The updated server must be deployed to allow requests from Lotto Bayern. The bookmarklet sends no account cookies.</p>
<p>There is no forced odd/even or high/low distribution. Methods change number selection, not the probability that an individual combination is drawn.</p>
<h2>Paste numbers or app JSON</h2><pre>4 12 20 27 49 | 2 9
8 16 25 34 46 | 5 11</pre>
<p>Accepts arrays of app tickets with <code>mainNumbers</code> and <code>euroNumbers</code>, earlier <code>mains</code>/<code>euros</code> objects, and Lotto Bayern payloads. Only standard 5+2 lines fit this form. System tickets are rejected rather than truncated.</p>
<p>Imports replace consecutive fields. Undo restores the previous fill while the panel remains open. Review the numbers and price on Lotto Bayern; saving and playing remain manual.</p>
<details><summary>Manual installation</summary><p>Create a bookmark and replace its URL with the entire text below, including <code>javascript:</code>.</p><textarea readonly aria-label="Bookmark URL">${escape(bookmarkUrl)}</textarea></details>
<p><a href="lotto-bayern-bookmarklet.js">Readable JavaScript</a> · <a href="lotto-bayern-bookmarklet-url.txt">Bookmark URL</a></p>
</html>`
)
console.log(
  `Built bookmarklet (${bookmarkUrl.length} URL characters) in public/bookmarklet/`
)
