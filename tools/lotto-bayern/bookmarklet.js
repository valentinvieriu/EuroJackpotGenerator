import {
  BOOKMARKLET_APP_ORIGIN,
  BOOKMARKLET_ALGORITHMS,
  BOOKMARKLET_EDITOR_TIMEOUT_MS,
  BOOKMARKLET_POLL_MS,
  LOTTO_BAYERN_ORIGIN,
  LOTTO_BAYERN_NORMAL_PATH,
  LOTTO_BAYERN_NORMAL_FIELD_MAX,
  TICKET_COUNT_MIN,
  MAIN_NUMBERS_COUNT,
  EURO_NUMBERS_COUNT,
  FAVORITE_NUMBERS_MAX,
  FAVORITE_WEIGHT_MULTIPLIER,
} from '../../app/utils/constants'
import { parseLines, formatLines } from './numbers'
import { generateFromApp } from './generatorClient'
/* global __BOOKMARKLET_STYLE__ */
;(() => {
  'use strict'
  // Bookmarklet source. Eurojackpot Normalschein only. Uses the site's editor;
  // generation goes through the app; filling never saves or submits the ticket.
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
  const fail = (message) => {
    throw new Error(message)
  }
  const check = (condition, message) => {
    if (!condition) fail(message)
  }
  const sorted = (numbers) => [...numbers].sort((a, b) => a - b)
  const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b))
  const fieldElement = (index) => document.getElementById(`tip-field-${index}`)
  function readNumbers(root, selector) {
    return [...root.querySelectorAll(selector)]
      .map((input) => input.value)
      .filter((value) => value !== '')
      .map(Number)
  }
  function readField(index) {
    const root = fieldElement(index)
    check(
      root,
      `Field ${index + 1} was not found. The page layout may have changed.`
    )
    check(
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
    fail(message)
  }
  const editorIsOpen = () =>
    document.getElementById('layer-tip')?.classList.contains('visible')
  async function applyField(index, row) {
    const opener = document.getElementById(`open-layer-${index}`)
    check(opener, `Cannot open field ${index + 1}.`)
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
    check(clear && confirm, 'The site editor controls have changed.')
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
        check(cell, `Number ${number} was not found in the editor.`)
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
    <style>${__BOOKMARKLET_STYLE__}</style>
    <section role="dialog" aria-label="Eurojackpot number filler">
      <button type="button" class="close" id="close" aria-label="Close number filler">×</button>
      <h2>Eurojackpot number filler</h2>
      <p>Paste one line per field: <strong>5 main numbers | 2 Euro numbers</strong>. JSON from the earlier snippets works too.</p>
      <label for="lines">Your numbers</label>
      <textarea id="lines" spellcheck="false" placeholder="4 12 20 27 49 | 2 9&#10;8 16 25 34 46 | 5 11"></textarea>
      <div class="row"><label for="start">Start at field <input id="start" type="number" min="1" max="12" value="1"></label><button type="button" id="draft">Use generated draft</button></div>
      <small>Imported lines replace consecutive fields. Other fields, draw day, duration and add-ons keep their current values.</small>
      <details><summary>Generate using the app’s algorithms</summary>
        <label for="appUrl">Generator app URL</label><input id="appUrl" type="url" value="${BOOKMARKLET_APP_ORIGIN}">
        <div class="row"><label for="count">Lines <input id="count" type="number" min="${TICKET_COUNT_MIN}" max="${LOTTO_BAYERN_NORMAL_FIELD_MAX}" value="${LOTTO_BAYERN_NORMAL_FIELD_MAX}"></label>
        <label for="algorithm">Method <select id="algorithm">${BOOKMARKLET_ALGORITHMS.map((option) => `<option value="${option.value}">${option.label}</option>`).join('')}</select></label></div>
        <p id="algorithmHelp"></p>
        <div id="favouriteControls" hidden>
          <label for="favMain">Main favourites (up to ${FAVORITE_NUMBERS_MAX})</label><input id="favMain" placeholder="e.g. 4, 12, 20, 27, 49">
          <label for="favEuro">Euro favourites (up to ${FAVORITE_NUMBERS_MAX})</label><input id="favEuro" placeholder="e.g. 2, 9">
          <p><small>Uses the app’s ${FAVORITE_WEIGHT_MULTIPLIER}× favourite weight. Statistics fallback follows the app’s existing behaviour.</small></p>
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
    check(
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
    status('Generating through your app…')
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
    check(
      !editorIsOpen(),
      'Close the Lotto Bayern number editor before filling.'
    )
    const rows = parseLines($('lines').value)
    const start = Number($('start').value) - 1
    check(
      Number.isInteger(start) &&
        start >= 0 &&
        start + rows.length <= LOTTO_BAYERN_NORMAL_FIELD_MAX,
      'The imported lines must fit within fields 1–12.'
    )
    const nextBackup = rows.map((row, i) => ({
      index: start + i,
      row: readField(start + i),
    }))
    for (const { index, row } of nextBackup) {
      check(
        document.getElementById(`open-layer-${index}`),
        `Field ${index + 1} cannot be opened.`
      )
      check(
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
        status(`Filling field ${start + i + 1} (${i + 1}/${rows.length})…`)
        await applyField(start + i, rows[i])
      }
      status(
        `Filled and checked ${rows.length} fields. Review the site’s ticket and price.`
      )
    } catch (error) {
      fail(
        `${error.message}\nSome fields may have changed. Close the site editor and use Undo fill to restore the previous numbers.`
      )
    } finally {
      setBusy(false)
    }
  })
  $('undo').onclick = handler(async () => {
    check(backup, 'Nothing to undo.')
    check(
      !editorIsOpen(),
      'Close the Lotto Bayern number editor before undoing.'
    )
    setBusy(true)
    try {
      for (const { index, row } of backup) {
        status(`Restoring field ${index + 1}…`)
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
