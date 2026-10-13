import {
  MAIN_NUMBERS_COUNT,
  EURO_NUMBERS_COUNT,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MAX,
  TICKET_COUNT_MIN,
  LOTTO_BAYERN_NORMAL_FIELD_MAX,
} from '../../app/utils/constants'

const fail = (message) => {
  throw new Error(message)
}
const check = (condition, message) => {
  if (!condition) fail(message)
}
const sorted = (numbers) => [...numbers].sort((a, b) => a - b)
export const integers = (value) => {
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
export function parseLines(text) {
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
            euros: row?.euros ?? row?.euroNumbers ?? row?.additionalPrognosises,
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
  const seen = new Set()
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
export const formatLines = (rows) =>
  rows
    .map((row) => `${row.mains.join(' ')} | ${row.euros.join(' ')}`)
    .join('\n')
