'use strict'
;(() => {
  // app/utils/constants.ts
  var MAIN_NUMBER_MAX = 50
  var EURO_NUMBER_MAX = 12
  var MAIN_NUMBERS_COUNT = 5
  var EURO_NUMBERS_COUNT = 2
  var WIN_CLASS_MIN = 1
  var WIN_CLASS_MAX = 12
  var TICKET_COUNT_MIN = 1
  var EUROJACKPOT_DRAW_DAYS = [2, 5]
  var DRAWS_PER_YEAR = EUROJACKPOT_DRAW_DAYS.length * 52
  var FAVORITE_NUMBERS_MAX = 5
  var FAVORITE_WEIGHT_MULTIPLIER = 10
  var LOTTO_BAYERN_ORIGIN = 'https://www.lotto-bayern.de'
  var LOTTO_BAYERN_NORMAL_PATH = '/eurojackpot/normalschein'
  var LOTTO_BAYERN_NORMAL_FIELD_MAX = 12
  var GENERATE_API_PATH = '/api/generate'
  var BOOKMARKLET_APP_ORIGIN = 'https://eurojackpot.vv42.workers.dev'
  var BOOKMARKLET_FETCH_TIMEOUT_MS = 2e4
  var BOOKMARKLET_EDITOR_TIMEOUT_MS = 4500
  var BOOKMARKLET_POLL_MS = 25
  var BOOKMARKLET_ALGORITHMS = [
    {
      value: 'uniform',
      label: 'Uniform random',
      description: 'Every valid combination has equal selection probability.',
    },
    {
      value: 'weighted',
      label: 'Weighted by historical frequencies',
      description:
        'Uses square-root frequencies and sampling without replacement. Falls back to uniform if statistics are unavailable. No forced odd/even or high/low pattern.',
    },
    {
      value: 'favorites',
      label: 'Favourites',
      description:
        'Uses the app\u2019s favourite weighting with historical frequencies. If statistics are unavailable, it includes favourites that fit and fills the remaining slots randomly.',
    },
    {
      value: 'unpopular',
      label: 'Unpopular combinations (heuristic)',
      description:
        'Ranks random candidates using the app\u2019s human-choice heuristics. The score is not measured player popularity or a calibrated prize-sharing probability.',
    },
  ]
  var WIN_CLASSES = Array.from(
    { length: WIN_CLASS_MAX - WIN_CLASS_MIN + 1 },
    (_, i) => WIN_CLASS_MIN + i
  )

  // tools/lotto-bayern/numbers.js
  var fail = (message) => {
    throw new Error(message)
  }
  var check = (condition, message) => {
    if (!condition) fail(message)
  }
  var sorted = (numbers) => [...numbers].sort((a, b) => a - b)
  var integers = (value) => {
    if (Array.isArray(value)) {
      return value.map((n) => {
        check(
          typeof n === 'number' || (typeof n === 'string' && /^\d+$/.test(n)),
          'Use integer numbers only.'
        )
        return Number(n)
      })
    }
    check(
      typeof value === 'string' && /^[\d\s,]*$/.test(value),
      'Separate numbers with spaces or commas.'
    )
    return value.trim()
      ? value
          .trim()
          .split(/[\s,]+/)
          .map(Number)
      : []
  }
  function validNumbers(value, count, max, label) {
    const numbers = integers(value)
    check(numbers.length === count, `${label}: expected ${count} numbers.`)
    check(
      numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= max),
      `${label}: numbers must be from 1 to ${max}.`
    )
    check(
      new Set(numbers).size === numbers.length,
      `${label}: duplicate numbers.`
    )
    return sorted(numbers)
  }
  function parseLines(text) {
    text = text.trim()
    check(text, 'Paste numbers or generate them first.')
    let rows
    if (/^[[{]/.test(text)) {
      let data
      try {
        data = JSON.parse(text)
      } catch {
        fail('Invalid JSON. Paste JSON data, not JavaScript code.')
      }
      rows = Array.isArray(data)
        ? data
        : (data?.mainPrognosises?.EUROJACKPOT ?? data?.fields ?? data?.tickets)
      check(
        Array.isArray(rows),
        'JSON must be an array of lines or a Eurojackpot draft payload.'
      )
      if (rows.every((n) => typeof n === 'number')) rows = [rows]
      rows = rows.map((row) =>
        Array.isArray(row)
          ? {
              mains: row.slice(0, MAIN_NUMBERS_COUNT),
              euros: row.slice(MAIN_NUMBERS_COUNT),
            }
          : {
              mains: row?.mains ?? row?.mainNumbers ?? row?.prognosises,
              euros:
                row?.euros ?? row?.euroNumbers ?? row?.additionalPrognosises,
            }
      )
    } else {
      rows = text.split(/[\r\n;]+/).map((line) => {
        const parts = line.trim().split(/[|+]/)
        check(
          parts.length <= 2,
          'Use one | or + between main numbers and Euro numbers.'
        )
        if (parts.length === 2)
          return { mains: integers(parts[0]), euros: integers(parts[1]) }
        const all = integers(parts[0])
        return {
          mains: all.slice(0, MAIN_NUMBERS_COUNT),
          euros: all.slice(MAIN_NUMBERS_COUNT),
        }
      })
    }
    check(
      rows.length >= TICKET_COUNT_MIN &&
        rows.length <= LOTTO_BAYERN_NORMAL_FIELD_MAX,
      'Enter 1 to 12 lines.'
    )
    const seen = /* @__PURE__ */ new Set()
    return rows.map((row, index) => {
      const mains = validNumbers(
        row.mains,
        MAIN_NUMBERS_COUNT,
        MAIN_NUMBER_MAX,
        `Line ${index + 1} main numbers`
      )
      const euros = validNumbers(
        row.euros,
        EURO_NUMBERS_COUNT,
        EURO_NUMBER_MAX,
        `Line ${index + 1} Euro numbers`
      )
      const key = `${mains}|${euros}`
      check(!seen.has(key), `Line ${index + 1} repeats an earlier line.`)
      seen.add(key)
      return { mains, euros }
    })
  }
  var formatLines = (rows) =>
    rows
      .map((row) => `${row.mains.join(' ')} | ${row.euros.join(' ')}`)
      .join('\n')

  // tools/lotto-bayern/generatorClient.ts
  function generatorOrigin(value) {
    const url = new URL(value)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname !== '/' && url.pathname !== '')
    ) {
      throw new Error(
        'Enter the app\u2019s HTTPS origin only, without a path, credentials, query, or fragment.'
      )
    }
    return url.origin
  }
  function generationRequest(options) {
    if (
      !BOOKMARKLET_ALGORITHMS.some(
        (option) => option.value === options.algorithm
      )
    ) {
      throw new Error('Choose a supported generation method.')
    }
    if (
      !Number.isInteger(options.ticketCount) ||
      options.ticketCount < TICKET_COUNT_MIN ||
      options.ticketCount > LOTTO_BAYERN_NORMAL_FIELD_MAX
    ) {
      throw new Error(
        `Generate ${TICKET_COUNT_MIN} to ${LOTTO_BAYERN_NORMAL_FIELD_MAX} lines.`
      )
    }
    const favouriteNumbers = (value, max) => {
      const numbers = integers(value)
      if (
        numbers.length > FAVORITE_NUMBERS_MAX ||
        new Set(numbers).size !== numbers.length ||
        !numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= max)
      ) {
        throw new Error(
          `Enter up to ${FAVORITE_NUMBERS_MAX} distinct favourite integers from 1 to ${max}.`
        )
      }
      return numbers
    }
    return {
      ticketCount: options.ticketCount,
      mainCount: MAIN_NUMBERS_COUNT,
      euroCount: EURO_NUMBERS_COUNT,
      algorithm: options.algorithm,
      ...(options.algorithm === 'favorites'
        ? {
            favoriteNumbers: {
              mainNumbers: favouriteNumbers(
                options.favouritesMain,
                MAIN_NUMBER_MAX
              ),
              euroNumbers: favouriteNumbers(
                options.favouritesEuro,
                EURO_NUMBER_MAX
              ),
            },
          }
        : {}),
    }
  }
  async function generateFromApp(options, fetcher = fetch) {
    const origin = generatorOrigin(options.appUrl)
    const body = generationRequest(options)
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      BOOKMARKLET_FETCH_TIMEOUT_MS
    )
    try {
      const response = await fetcher(`${origin}${GENERATE_API_PATH}`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'error',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify(body),
      })
      if (!response.ok)
        throw new Error(`App generation failed (HTTP ${response.status}).`)
      const rows = parseLines(JSON.stringify(await response.json()))
      if (rows.length !== options.ticketCount)
        throw new Error('The app returned an unexpected number of lines.')
      return rows
    } catch (error) {
      if (controller.signal.aborted)
        throw new Error(
          'App generation timed out. Check the app before retrying.'
        )
      if (error instanceof TypeError) {
        throw new TypeError(
          'Cannot reach the generator. Check the app URL, connection, and deployed Lotto Bayern CORS support.'
        )
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  // tools/lotto-bayern/bookmarklet.js
  ;(() => {
    'use strict'
    if (
      location.origin !== LOTTO_BAYERN_ORIGIN ||
      location.pathname.replace(/\/$/, '') !== LOTTO_BAYERN_NORMAL_PATH
    ) {
      alert('Open https://www.lotto-bayern.de/eurojackpot/normalschein first.')
      return
    }
    const hostId = 'lb-number-filler-v2'
    const existing = document.getElementById(hostId)
    if (existing) {
      existing.shadowRoot.querySelector('textarea').focus()
      return
    }
    const fail2 = (message) => {
      throw new Error(message)
    }
    const check2 = (condition, message) => {
      if (!condition) fail2(message)
    }
    const sorted2 = (numbers) => [...numbers].sort((a, b) => a - b)
    const same = (a, b) =>
      JSON.stringify(sorted2(a)) === JSON.stringify(sorted2(b))
    const fieldElement = (index) =>
      document.getElementById(`tip-field-${index}`)
    function readNumbers(root, selector) {
      return [...root.querySelectorAll(selector)]
        .map((input) => input.value)
        .filter((value) => value !== '')
        .map(Number)
    }
    function readField(index) {
      const root = fieldElement(index)
      check2(
        root,
        `Field ${index + 1} was not found. The page layout may have changed.`
      )
      check2(
        root.querySelectorAll('.tipfield-form-controls input[type=number]')
          .length === MAIN_NUMBERS_COUNT &&
          root.querySelectorAll(
            '.tipfield-form-controls-extra input[type=number]'
          ).length === EURO_NUMBERS_COUNT,
        `Field ${index + 1}: unexpected page controls.`
      )
      return {
        mains: readNumbers(root, '.tipfield-form-controls input[type=number]'),
        euros: readNumbers(
          root,
          '.tipfield-form-controls-extra input[type=number]'
        ),
      }
    }
    const tick = () =>
      new Promise((resolve) => setTimeout(resolve, BOOKMARKLET_POLL_MS))
    async function until(predicate, message) {
      const deadline = Date.now() + BOOKMARKLET_EDITOR_TIMEOUT_MS
      do {
        if (predicate()) return
        await tick()
      } while (Date.now() < deadline)
      fail2(message)
    }
    const editorIsOpen = () =>
      document.getElementById('layer-tip')?.classList.contains('visible')
    async function applyField(index, row) {
      const opener = document.getElementById(`open-layer-${index}`)
      check2(opener, `Cannot open field ${index + 1}.`)
      opener.click()
      await until(
        () =>
          editorIsOpen() &&
          document
            .querySelector('#layer-tip .field-number')
            ?.textContent.trim() === String(index + 1),
        `The editor for field ${index + 1} did not open.`
      )
      const layer = document.getElementById('layer-tip')
      const clear = layer.querySelector('[data-action-delete]')
      const confirm = layer.querySelector('[data-action-confirm]')
      check2(clear && confirm, 'The site editor controls have changed.')
      clear.click()
      await until(
        () => !readNumbers(layer, 'input[type=number]').length,
        'The editor did not clear.'
      )
      for (const [selector, numbers] of [
        ['[data-numbers-primary]', row.mains],
        ['[data-numbers-secondary]', row.euros],
      ]) {
        for (const number of numbers) {
          const cell = layer.querySelector(
            `${selector} [data-number="${number}"]`
          )
          check2(cell, `Number ${number} was not found in the editor.`)
          cell.click()
          await tick()
        }
      }
      await until(
        () =>
          same(
            readNumbers(layer, '.tipfield-form-controls input[type=number]'),
            row.mains
          ) &&
          same(
            readNumbers(
              layer,
              '.tipfield-form-controls-extra input[type=number]'
            ),
            row.euros
          ),
        `The editor did not accept the numbers for field ${index + 1}.`
      )
      confirm.click()
      await until(
        () => {
          const result = readField(index)
          return (
            !editorIsOpen() &&
            same(result.mains, row.mains) &&
            same(result.euros, row.euros)
          )
        },
        `Field ${index + 1} did not update. Inspect the site before continuing.`
      )
    }
    const host = document.createElement('div')
    host.id = hostId
    host.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:calc(100vw - 32px);'
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = `
    <style>${":host{--color-content-primary:oklch(0.98 0.003 80);--color-surface-primary-light:oklch(0.22 0.025 229);--color-border-secondary:oklch(0.25 0.03 229);--color-surface-tertiary:oklch(0.12 0.02 229);--color-content-secondary:oklch(0.75 0.01 229);--color-border-primary:oklch(0.85 0.12 85);--color-surface-secondary:oklch(0.25 0.03 229);--color-surface-card-hover:oklch(0.28 0.03 229);--color-interactive-primary:oklch(0.6 0.2 25);--color-content-inverse:oklch(0.13 0.02 229);--color-error:oklch(0.6 0.2 15);}\n:host {\n  color-scheme: dark;\n  font:\n    14px/1.5 system-ui,\n    sans-serif;\n  color: var(--color-content-primary);\n}\n* {\n  box-sizing: border-box;\n}\nsection {\n  width: 500px;\n  max-width: calc(100vw - 32px);\n  max-height: 88vh;\n  overflow: auto;\n  background: var(--color-surface-primary-light);\n  border: 1px solid var(--color-border-secondary);\n  border-radius: 16px;\n  box-shadow: 0 12px 60px\n    color-mix(in srgb, var(--color-surface-tertiary) 65%, transparent);\n  padding: 22px;\n}\nh2 {\n  font-size: 21px;\n  line-height: 1.2;\n  margin: 0 0 8px;\n}\np {\n  margin: 8px 0;\n  color: var(--color-content-secondary);\n}\nlabel {\n  display: block;\n  font-weight: 600;\n  margin: 10px 0 4px;\n}\ntextarea,\ninput,\nselect {\n  font: inherit;\n  border: 1px solid var(--color-border-primary);\n  border-radius: 7px;\n  padding: 9px;\n  background: var(--color-surface-primary-light);\n  color: var(--color-content-primary);\n  width: 100%;\n}\ntextarea {\n  min-height: 125px;\n  resize: vertical;\n  font:\n    13px/1.6 ui-monospace,\n    monospace;\n}\nbutton {\n  font: 600 14px system-ui;\n  cursor: pointer;\n  padding: 10px 13px;\n  border: 1px solid var(--color-border-secondary);\n  border-radius: 7px;\n  background: var(--color-surface-secondary);\n  color: var(--color-content-primary);\n}\nbutton:hover {\n  background: var(--color-surface-card-hover);\n}\nbutton:disabled {\n  opacity: 0.5;\n  cursor: wait;\n}\nbutton.primary {\n  background: var(--color-interactive-primary);\n  color: var(--color-content-inverse);\n  border-color: var(--color-interactive-primary);\n}\n.row {\n  display: flex;\n  gap: 8px;\n  align-items: end;\n  flex-wrap: wrap;\n}\n.row > label {\n  flex: 1;\n  min-width: 110px;\n}\n.actions {\n  margin-top: 14px;\n}\n.close {\n  float: right;\n  font-size: 18px;\n  padding: 3px 9px;\n}\ndetails {\n  border-top: 1px solid var(--color-border-secondary);\n  margin-top: 14px;\n  padding-top: 12px;\n}\nsummary {\n  cursor: pointer;\n  font-weight: 600;\n}\npre {\n  font:\n    12px/1.6 ui-monospace,\n    monospace;\n  white-space: pre-wrap;\n  background: var(--color-surface-secondary);\n  border-radius: 8px;\n  padding: 10px;\n  max-height: 180px;\n  overflow: auto;\n}\npre:empty {\n  display: none;\n}\n.status {\n  min-height: 22px;\n  margin-top: 10px;\n  white-space: pre-wrap;\n}\n.error {\n  color: var(--color-error);\n}\nsmall {\n  color: var(--color-content-secondary);\n}\ninput[type='number'] {\n  max-width: 120px;\n}\n"}</style>
    <section role="dialog" aria-label="Eurojackpot number filler">
      <button type="button" class="close" id="close" aria-label="Close number filler">\xD7</button>
      <h2>Eurojackpot number filler</h2>
      <p>Paste one line per field: <strong>5 main numbers | 2 Euro numbers</strong>. JSON from the earlier snippets works too.</p>
      <label for="lines">Your numbers</label>
      <textarea id="lines" spellcheck="false" placeholder="4 12 20 27 49 | 2 9&#10;8 16 25 34 46 | 5 11"></textarea>
      <div class="row"><label for="start">Start at field <input id="start" type="number" min="1" max="12" value="1"></label><button type="button" id="draft">Use generated draft</button></div>
      <small>Imported lines replace consecutive fields. Other fields, draw day, duration and add-ons keep their current values.</small>
      <details><summary>Generate using the app\u2019s algorithms</summary>
        <label for="appUrl">Generator app URL</label><input id="appUrl" type="url" value="${BOOKMARKLET_APP_ORIGIN}">
        <div class="row"><label for="count">Lines <input id="count" type="number" min="${TICKET_COUNT_MIN}" max="${LOTTO_BAYERN_NORMAL_FIELD_MAX}" value="${LOTTO_BAYERN_NORMAL_FIELD_MAX}"></label>
        <label for="algorithm">Method <select id="algorithm">${BOOKMARKLET_ALGORITHMS.map((option) => `<option value="${option.value}">${option.label}</option>`).join('')}</select></label></div>
        <p id="algorithmHelp"></p>
        <div id="favouriteControls" hidden>
          <label for="favMain">Main favourites (up to ${FAVORITE_NUMBERS_MAX})</label><input id="favMain" placeholder="e.g. 4, 12, 20, 27, 49">
          <label for="favEuro">Euro favourites (up to ${FAVORITE_NUMBERS_MAX})</label><input id="favEuro" placeholder="e.g. 2, 9">
          <p><small>Uses the app\u2019s ${FAVORITE_WEIGHT_MULTIPLIER}\xD7 favourite weight. Statistics fallback follows the app\u2019s existing behaviour.</small></p>
        </div>
        <p><small>Generation sends your selected method and favourites to your app. Its server generates the numbers; filling the Lotto Bayern form is a separate action.</small></p>
        <button type="button" id="generate">Generate preview</button>
      </details>
      <pre id="preview"></pre>
      <div class="row actions"><button type="button" id="validate">Preview</button><button type="button" id="fill" class="primary">Fill ticket fields</button><button type="button" id="undo" disabled>Undo fill</button></div>
      <div id="status" role="status" aria-live="polite" class="status"></div>
      <small>Fills the form only. Review the ticket and price on Lotto Bayern before saving or playing.</small>
    </section>`
    document.body.append(host)
    const $ = (id) => shadow.getElementById(id)
    let busy = false
    let backup = null
    const status = (text, error = false) => {
      $('status').textContent = text
      $('status').classList.toggle('error', error)
    }
    const setBusy = (value) => {
      busy = value
      shadow.querySelectorAll('button,input,textarea,select').forEach((el) => {
        el.disabled = value
      })
      $('undo').disabled = value || !backup
    }
    const handler = (action) => async () => {
      if (busy) return
      try {
        await action()
      } catch (error) {
        status(error.message, true)
      }
    }
    function preview(rows) {
      $('preview').textContent = formatLines(rows)
      status(
        `${rows.length} valid line${rows.length === 1 ? '' : 's'}. Ready to fill.`
      )
    }
    $('close').onclick = () => {
      if (!busy) host.remove()
    }
    $('validate').onclick = handler(() => preview(parseLines($('lines').value)))
    $('draft').onclick = handler(() => {
      const data =
        window.eurojackpotFavourites?.data ?? window.eurojackpotSnippet?.data
      check2(
        data,
        'No generated draft found. Run a preview snippet on this page, or paste its JSON.'
      )
      const rows = parseLines(JSON.stringify(data))
      $('lines').value = formatLines(rows)
      preview(rows)
    })
    const updateAlgorithm = () => {
      const method = BOOKMARKLET_ALGORITHMS.find(
        (option) => option.value === $('algorithm').value
      )
      $('algorithmHelp').textContent = method.description
      $('favouriteControls').hidden = method.value !== 'favorites'
    }
    $('algorithm').onchange = updateAlgorithm
    updateAlgorithm()
    $('generate').onclick = handler(async () => {
      setBusy(true)
      status('Generating through your app\u2026')
      try {
        const rows = await generateFromApp({
          appUrl: $('appUrl').value,
          algorithm: $('algorithm').value,
          ticketCount: Number($('count').value),
          favouritesMain: $('favMain').value,
          favouritesEuro: $('favEuro').value,
        })
        $('lines').value = formatLines(rows)
        preview(rows)
      } finally {
        setBusy(false)
      }
    })
    $('fill').onclick = handler(async () => {
      check2(
        !editorIsOpen(),
        'Close the Lotto Bayern number editor before filling.'
      )
      const rows = parseLines($('lines').value)
      const start = Number($('start').value) - 1
      check2(
        Number.isInteger(start) &&
          start >= 0 &&
          start + rows.length <= LOTTO_BAYERN_NORMAL_FIELD_MAX,
        'The imported lines must fit within fields 1\u201312.'
      )
      const nextBackup = rows.map((row, i) => ({
        index: start + i,
        row: readField(start + i),
      }))
      for (const { index, row } of nextBackup) {
        check2(
          document.getElementById(`open-layer-${index}`),
          `Field ${index + 1} cannot be opened.`
        )
        check2(
          (row.mains.length === 0 && row.euros.length === 0) ||
            (row.mains.length === MAIN_NUMBERS_COUNT &&
              row.euros.length === EURO_NUMBERS_COUNT),
          `Field ${index + 1} is partly filled. Complete or clear it on the site first.`
        )
      }
      backup = nextBackup
      setBusy(true)
      try {
        for (let i = 0; i < rows.length; i++) {
          status(
            `Filling field ${start + i + 1} (${i + 1}/${rows.length})\u2026`
          )
          await applyField(start + i, rows[i])
        }
        status(
          `Filled and checked ${rows.length} fields. Review the site\u2019s ticket and price.`
        )
      } catch (error) {
        fail2(
          `${error.message}
Some fields may have changed. Close the site editor and use Undo fill to restore the previous numbers.`
        )
      } finally {
        setBusy(false)
      }
    })
    $('undo').onclick = handler(async () => {
      check2(backup, 'Nothing to undo.')
      check2(
        !editorIsOpen(),
        'Close the Lotto Bayern number editor before undoing.'
      )
      setBusy(true)
      try {
        for (const { index, row } of backup) {
          status(`Restoring field ${index + 1}\u2026`)
          await applyField(index, row)
        }
        backup = null
        status('Previous numbers restored and checked.')
      } finally {
        setBusy(false)
      }
    })
    $('lines').focus()
  })()
})()
