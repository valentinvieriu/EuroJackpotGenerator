/**
 * Everything that touches Lotto Bayern's own page lives here: reading a ticket
 * field and driving the site's number editor to fill one.
 *
 * It only ever clicks what a person would click, checks after every step that
 * the page did what was asked, and never saves or submits the ticket.
 * If the site changes its markup, this is the file to update.
 */

import {
  MAIN_NUMBERS_COUNT,
  EURO_NUMBERS_COUNT,
  BOOKMARKLET_EDITOR_TIMEOUT_MS,
  BOOKMARKLET_POLL_MS,
} from '~/utils/constants'

// The site's markup, as of the last time this was checked against it
const MAIN_INPUTS = '.tipfield-form-controls input[type=number]'
const EURO_INPUTS = '.tipfield-form-controls-extra input[type=number]'
const EDITOR_ID = 'layer-tip'
const fieldElement = (index) => document.getElementById(`tip-field-${index}`)
const fieldOpener = (index) => document.getElementById(`open-layer-${index}`)

export const fail = (message) => {
  throw new Error(message)
}
export const check = (condition, message) => {
  if (!condition) fail(message)
}

const sorted = (numbers) => [...numbers].sort((a, b) => a - b)
const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b))

function readNumbers(root, selector) {
  return [...root.querySelectorAll(selector)]
    .map((input) => input.value)
    .filter((value) => value !== '')
    .map(Number)
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

export const editorIsOpen = () =>
  document.getElementById(EDITOR_ID)?.classList.contains('visible')

export const fieldCanOpen = (index) => !!fieldOpener(index)

/** The numbers currently in a ticket field (empty arrays for an empty field) */
export function readField(index) {
  const root = fieldElement(index)
  check(
    root,
    `Field ${index + 1} was not found. The page layout may have changed.`
  )
  check(
    root.querySelectorAll(MAIN_INPUTS).length === MAIN_NUMBERS_COUNT &&
      root.querySelectorAll(EURO_INPUTS).length === EURO_NUMBERS_COUNT,
    `Field ${index + 1}: unexpected page controls.`
  )
  return {
    mainNumbers: readNumbers(root, MAIN_INPUTS),
    euroNumbers: readNumbers(root, EURO_INPUTS),
  }
}

/** Open the site's editor for one field, enter the line, confirm, and verify the result */
export async function applyField(index, line) {
  const opener = fieldOpener(index)
  check(opener, `Cannot open field ${index + 1}.`)
  opener.click()
  await until(
    () =>
      editorIsOpen() &&
      document
        .querySelector(`#${EDITOR_ID} .field-number`)
        ?.textContent.trim() === String(index + 1),
    `The editor for field ${index + 1} did not open.`
  )

  const editor = document.getElementById(EDITOR_ID)
  const clear = editor.querySelector('[data-action-delete]')
  const confirm = editor.querySelector('[data-action-confirm]')
  check(clear && confirm, 'The site editor controls have changed.')

  clear.click()
  await until(
    () => !readNumbers(editor, 'input[type=number]').length,
    'The editor did not clear.'
  )

  for (const [grid, numbers] of [
    ['[data-numbers-primary]', line.mainNumbers],
    ['[data-numbers-secondary]', line.euroNumbers],
  ]) {
    for (const number of numbers) {
      const cell = editor.querySelector(`${grid} [data-number="${number}"]`)
      check(cell, `Number ${number} was not found in the editor.`)
      cell.click()
      await tick()
    }
  }

  await until(
    () =>
      same(readNumbers(editor, MAIN_INPUTS), line.mainNumbers) &&
      same(readNumbers(editor, EURO_INPUTS), line.euroNumbers),
    `The editor did not accept the numbers for field ${index + 1}.`
  )

  confirm.click()
  await until(
    () => {
      const result = readField(index)
      return (
        !editorIsOpen() &&
        same(result.mainNumbers, line.mainNumbers) &&
        same(result.euroNumbers, line.euroNumbers)
      )
    },
    `Field ${index + 1} did not update. Inspect the site before continuing.`
  )
}
