/**
 * Standard ticket lines as plain text: "4 12 20 27 49 | 2 9", one line per row.
 *
 * This is the hand-over format between the app and the Lotto Bayern
 * bookmarklet: the app writes it, the bookmarklet reads it. Both import this
 * module, so the rules for what counts as a valid line live in one place.
 *
 * Validation is written by hand rather than with the Zod ticket schema because
 * this file is bundled into the bookmarklet, where every kilobyte ends up in
 * the bookmark's URL.
 */

import type { Ticket } from '~/schemas'
import {
  MAIN_NUMBERS_COUNT,
  EURO_NUMBERS_COUNT,
  MAIN_NUMBER_MIN,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MIN,
  EURO_NUMBER_MAX,
  TICKET_COUNT_MIN,
  LOTTO_BAYERN_ORIGIN,
  LOTTO_BAYERN_NORMAL_PATH,
  LOTTO_BAYERN_NORMAL_FIELD_MAX,
  LOTTO_BAYERN_HANDOFF_KEY,
} from '~/utils/constants'

/** One standard line: 5 main numbers and 2 Euro numbers, each sorted ascending */
export interface TicketLine {
  mainNumbers: number[]
  euroNumbers: number[]
}

/** The lines of a ticket set that fit a standard slip, and what had to stay behind */
export interface TicketLineExport {
  lines: TicketLine[]
  /** System tickets (more than 5 + 2 numbers) cannot be entered as a standard line */
  skippedSystemTickets: number
  /** Standard tickets beyond the slip's capacity */
  skippedOverLimit: number
}

interface RawLine {
  mainNumbers: unknown
  euroNumbers: unknown
}

const fail = (message: string): never => {
  throw new Error(message)
}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message)
}

const sorted = (numbers: number[]) => [...numbers].sort((a, b) => a - b)

/** Read a list of integers from an array or from "1 2 3" / "1,2,3" text */
function integers(value: unknown): number[] {
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

function validNumbers(
  value: unknown,
  count: number,
  min: number,
  max: number,
  label: string
): number[] {
  const numbers = integers(value)
  check(numbers.length === count, `${label}: expected ${count} numbers.`)
  check(
    numbers.every((n) => Number.isInteger(n) && n >= min && n <= max),
    `${label}: numbers must be from ${min} to ${max}.`
  )
  check(
    new Set(numbers).size === numbers.length,
    `${label}: duplicate numbers.`
  )
  return sorted(numbers)
}

/** A flat list of numbers is split by position: mains first, then Euro numbers */
const splitByPosition = (numbers: unknown[]): RawLine => ({
  mainNumbers: numbers.slice(0, MAIN_NUMBERS_COUNT),
  euroNumbers: numbers.slice(MAIN_NUMBERS_COUNT),
})

/**
 * Accepts the app's tickets (`mainNumbers` / `euroNumbers`), bare arrays, the
 * earlier `mains` / `euros` shape, and Lotto Bayern's own draft payload.
 */
function rawLinesFromJson(text: string): RawLine[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    fail('Invalid JSON. Paste JSON data, not JavaScript code.')
  }

  const container = data as Record<string, unknown> | null
  let rows = Array.isArray(data)
    ? data
    : ((container?.mainPrognosises as Record<string, unknown> | undefined)
        ?.EUROJACKPOT ??
      container?.fields ??
      container?.tickets)
  check(
    Array.isArray(rows),
    'JSON must be an array of lines or a Eurojackpot draft payload.'
  )
  if (rows.every((n) => typeof n === 'number')) rows = [rows]

  return (rows as unknown[]).map((row) => {
    if (Array.isArray(row)) return splitByPosition(row)
    const fields = row as Record<string, unknown> | null
    return {
      mainNumbers:
        fields?.mainNumbers ?? fields?.mains ?? fields?.prognosises ?? null,
      euroNumbers:
        fields?.euroNumbers ??
        fields?.euros ??
        fields?.additionalPrognosises ??
        null,
    }
  })
}

function rawLinesFromText(text: string): RawLine[] {
  return text.split(/[\r\n;]+/).map((line) => {
    const parts = line.trim().split(/[|+]/)
    check(
      parts.length <= 2,
      'Use one | or + between main numbers and Euro numbers.'
    )
    if (parts.length === 2) {
      return {
        mainNumbers: integers(parts[0]),
        euroNumbers: integers(parts[1]),
      }
    }
    return splitByPosition(integers(parts[0]))
  })
}

/**
 * Parse pasted text or JSON into validated standard lines.
 * Throws an Error with a message fit to show the user when anything is off.
 * Nothing in the input is ever evaluated.
 */
export function parseTicketLines(input: string): TicketLine[] {
  const text = input.trim()
  check(text, 'Paste numbers or send them from the app first.')

  const rows = /^[[{]/.test(text)
    ? rawLinesFromJson(text)
    : rawLinesFromText(text)
  check(
    rows.length >= TICKET_COUNT_MIN &&
      rows.length <= LOTTO_BAYERN_NORMAL_FIELD_MAX,
    `Enter ${TICKET_COUNT_MIN} to ${LOTTO_BAYERN_NORMAL_FIELD_MAX} lines.`
  )

  const seen = new Set<string>()
  return rows.map((row, index) => {
    const mainNumbers = validNumbers(
      row.mainNumbers,
      MAIN_NUMBERS_COUNT,
      MAIN_NUMBER_MIN,
      MAIN_NUMBER_MAX,
      `Line ${index + 1} main numbers`
    )
    const euroNumbers = validNumbers(
      row.euroNumbers,
      EURO_NUMBERS_COUNT,
      EURO_NUMBER_MIN,
      EURO_NUMBER_MAX,
      `Line ${index + 1} Euro numbers`
    )
    const key = `${mainNumbers}|${euroNumbers}`
    check(!seen.has(key), `Line ${index + 1} repeats an earlier line.`)
    seen.add(key)
    return { mainNumbers, euroNumbers }
  })
}

/** "4 12 20 27 49 | 2 9", one line per row */
export function formatTicketLines(lines: TicketLine[]): string {
  return lines
    .map(
      (line) => `${line.mainNumbers.join(' ')} | ${line.euroNumbers.join(' ')}`
    )
    .join('\n')
}

/**
 * Pick the tickets that fit a standard Lotto Bayern slip: 5 + 2 lines only,
 * up to the slip's capacity, in ticket order.
 */
export function ticketsToStandardLines(tickets: Ticket[]): TicketLineExport {
  const standard = tickets.filter(
    (ticket) =>
      ticket.mainNumbers.length === MAIN_NUMBERS_COUNT &&
      ticket.euroNumbers.length === EURO_NUMBERS_COUNT
  )
  return {
    lines: standard.slice(0, LOTTO_BAYERN_NORMAL_FIELD_MAX).map((ticket) => ({
      mainNumbers: sorted(ticket.mainNumbers),
      euroNumbers: sorted(ticket.euroNumbers),
    })),
    skippedSystemTickets: tickets.length - standard.length,
    skippedOverLimit: Math.max(
      0,
      standard.length - LOTTO_BAYERN_NORMAL_FIELD_MAX
    ),
  }
}

// --- Hand-over in the URL fragment ---
// Lines travel as "4.12.20.27.49-2.9_8.16.25.34.46-5.11": digits plus three
// characters that never need URL encoding, so nothing can be mangled on the way.

const HANDOFF_PATTERN = /^[\d._-]+$/

/**
 * Link to the Lotto Bayern Eurojackpot form carrying the lines in its fragment.
 * The fragment stays in the browser: it is not sent to Lotto Bayern's server.
 */
export function buildLottoBayernUrl(lines: TicketLine[]): string {
  const base = `${LOTTO_BAYERN_ORIGIN}${LOTTO_BAYERN_NORMAL_PATH}`
  if (lines.length === 0) return base
  const encoded = lines
    .map(
      (line) => `${line.mainNumbers.join('.')}-${line.euroNumbers.join('.')}`
    )
    .join('_')
  return `${base}#${LOTTO_BAYERN_HANDOFF_KEY}=${encoded}`
}

/**
 * Read handed-over lines out of a URL fragment, as text for parseTicketLines().
 * Returns null when the fragment carries no hand-over or is not in the expected shape.
 */
export function readHandoff(hash: string): string | null {
  const prefix = `${LOTTO_BAYERN_HANDOFF_KEY}=`
  const fragment = hash.replace(/^#/, '')
  if (!fragment.startsWith(prefix)) return null

  const encoded = fragment.slice(prefix.length)
  if (!HANDOFF_PATTERN.test(encoded)) return null

  return encoded
    .replaceAll('_', '\n')
    .replaceAll('-', ' | ')
    .replaceAll('.', ' ')
}
