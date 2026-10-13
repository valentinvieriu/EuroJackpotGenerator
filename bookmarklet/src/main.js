/**
 * Lotto Bayern number filler (bookmarklet entry point).
 *
 * Takes ticket lines chosen in the EuroJackpot Simulator and enters them into
 * Lotto Bayern's Eurojackpot Normalschein. The lines arrive in the page URL
 * (the app's "Open Lotto Bayern" link) or are pasted in. Numbers are never
 * generated here: that stays in the app.
 *
 * Filling uses the site's own editor and never saves or submits the ticket.
 */

import {
  LOTTO_BAYERN_ORIGIN,
  LOTTO_BAYERN_NORMAL_PATH,
  LOTTO_BAYERN_NORMAL_FIELD_MAX,
  MAIN_NUMBERS_COUNT,
  EURO_NUMBERS_COUNT,
} from '~/utils/constants'
import {
  parseTicketLines,
  formatTicketLines,
  readHandoff,
} from '~/utils/ticketLines'
import {
  applyField,
  check,
  editorIsOpen,
  fail,
  fieldCanOpen,
  readField,
} from './lottoBayernForm'
/* global __BOOKMARKLET_STYLE__ */
;(() => {
  'use strict'
  if (
    location.origin !== LOTTO_BAYERN_ORIGIN ||
    location.pathname.replace(/\/$/, '') !== LOTTO_BAYERN_NORMAL_PATH
  ) {
    alert(`Open ${LOTTO_BAYERN_ORIGIN}${LOTTO_BAYERN_NORMAL_PATH} first.`)
    return
  }
  const hostId = 'lb-number-filler-v3'
  const existing = document.getElementById(hostId)
  if (existing) {
    existing.shadowRoot.querySelector('textarea').focus()
    return
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
      <p>One line per field: <strong>${MAIN_NUMBERS_COUNT} main numbers | ${EURO_NUMBERS_COUNT} Euro numbers</strong>. Lines sent from the EuroJackpot Simulator appear here by themselves; you can also paste them.</p>
      <label for="lines">Your numbers</label>
      <textarea id="lines" spellcheck="false" placeholder="4 12 20 27 49 | 2 9&#10;8 16 25 34 46 | 5 11"></textarea>
      <div class="row"><label for="start">Start at field <input id="start" type="number" min="1" max="${LOTTO_BAYERN_NORMAL_FIELD_MAX}" value="1"></label><button type="button" id="draft">Use generated draft</button></div>
      <small>Imported lines replace consecutive fields. Other fields, draw day, duration and add-ons keep their current values.</small>
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
    shadow.querySelectorAll('button,input,textarea').forEach((el) => {
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
  const countOf = (lines) =>
    `${lines.length} line${lines.length === 1 ? '' : 's'}`

  function preview(lines, lead = `${countOf(lines)} valid.`) {
    $('preview').textContent = formatTicketLines(lines)
    status(`${lead} Ready to fill.`)
  }
  /** Show lines in the editable box and the preview */
  function load(lines, lead) {
    $('lines').value = formatTicketLines(lines)
    preview(lines, lead)
  }

  $('close').onclick = () => {
    if (!busy) host.remove()
  }
  $('validate').onclick = handler(() =>
    preview(parseTicketLines($('lines').value))
  )
  // Picks up a draft left on the page by the earlier console snippets
  $('draft').onclick = handler(() => {
    const data =
      window.eurojackpotFavourites?.data ?? window.eurojackpotSnippet?.data
    check(
      data,
      'No generated draft found on this page. Send lines from the app or paste them.'
    )
    load(parseTicketLines(JSON.stringify(data)))
  })

  $('fill').onclick = handler(async () => {
    check(
      !editorIsOpen(),
      'Close the Lotto Bayern number editor before filling.'
    )
    const lines = parseTicketLines($('lines').value)
    const start = Number($('start').value) - 1
    check(
      Number.isInteger(start) &&
        start >= 0 &&
        start + lines.length <= LOTTO_BAYERN_NORMAL_FIELD_MAX,
      `The imported lines must fit within fields 1–${LOTTO_BAYERN_NORMAL_FIELD_MAX}.`
    )
    const nextBackup = lines.map((_, i) => ({
      index: start + i,
      line: readField(start + i),
    }))
    for (const { index, line } of nextBackup) {
      check(fieldCanOpen(index), `Field ${index + 1} cannot be opened.`)
      check(
        (line.mainNumbers.length === 0 && line.euroNumbers.length === 0) ||
          (line.mainNumbers.length === MAIN_NUMBERS_COUNT &&
            line.euroNumbers.length === EURO_NUMBERS_COUNT),
        `Field ${index + 1} is partly filled. Complete or clear it on the site first.`
      )
    }
    backup = nextBackup
    setBusy(true)
    try {
      for (let i = 0; i < lines.length; i++) {
        status(`Filling field ${start + i + 1} (${i + 1}/${lines.length})…`)
        await applyField(start + i, lines[i])
      }
      status(
        `Filled and checked ${lines.length} fields. Review the site’s ticket and price.`
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
      for (const { index, line } of backup) {
        status(`Restoring field ${index + 1}…`)
        await applyField(index, line)
      }
      backup = null
      status('Previous numbers restored and checked.')
    } finally {
      setBusy(false)
    }
  })

  // Lines handed over by the app in the URL fragment are loaded straight away
  const handedOver = readHandoff(location.hash)
  if (handedOver) {
    try {
      const lines = parseTicketLines(handedOver)
      load(lines, `${countOf(lines)} received from the app.`)
    } catch (error) {
      status(
        `The lines sent from the app could not be read: ${error.message}`,
        true
      )
    }
  }
  $('lines').focus()
})()
