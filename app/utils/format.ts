import { DRAWS_PER_YEAR } from '~/utils/constants'

const MINUS = '−'
const WEEKS_PER_YEAR = 52

const euroFormatters = new Map<number, Intl.NumberFormat>()

function euroFormatter(decimals: number): Intl.NumberFormat {
  let formatter = euroFormatters.get(decimals)
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    euroFormatters.set(decimals, formatter)
  }
  return formatter
}

export interface FormatEuroOptions {
  /** Prefix positive amounts with "+" (negative amounts always carry a minus). */
  sign?: boolean
  decimals?: number
}

/**
 * Format a euro amount with thousands separators and the sign before the symbol,
 * e.g. "€20,000.00", "−€20.00", "+€4.50".
 */
export function formatEuro(
  amount: number,
  { sign = false, decimals = 2 }: FormatEuroOptions = {}
): string {
  if (!Number.isFinite(amount)) return '—'
  const rounded = Number(amount.toFixed(decimals))
  const body = `€${euroFormatter(decimals).format(Math.abs(rounded))}`
  if (rounded < 0) return `${MINUS}${body}`
  if (sign && rounded > 0) return `+${body}`
  return body
}

/**
 * Short euro amount for axis ticks and tight labels, e.g. "€950", "€1.5k", "€20k", "€1.2M".
 */
export function formatEuroCompact(amount: number): string {
  if (!Number.isFinite(amount)) return '—'
  const abs = Math.abs(amount)
  const prefix = amount < 0 ? MINUS : ''
  const trim = (n: number) => String(Number(n.toFixed(1)))
  if (abs >= 1_000_000) return `${prefix}€${trim(abs / 1_000_000)}M`
  if (abs >= 1_000) return `${prefix}€${trim(abs / 1_000)}k`
  return `${prefix}€${Math.round(abs)}`
}

/**
 * Express a per-euro fraction as cents, e.g. 0.18925 → "19¢" (or "18.9¢" with one decimal).
 */
export function formatCents(perEuro: number, decimals = 0): string {
  if (!Number.isFinite(perEuro)) return '—'
  return `${(perEuro * 100).toFixed(decimals)}¢`
}

export function formatCount(n: number): string {
  return Math.round(n).toLocaleString('en-GB')
}

/** Format a probability as "1 in N". */
export function formatOdds(probability: number): string {
  if (!(probability > 0)) return '—'
  return `1 in ${formatCount(1 / probability)}`
}

/**
 * Express a number of draws as real playing time at the official draw schedule,
 * e.g. 1,000 draws → "9.6 years".
 */
export function formatPlayingTime(draws: number): string {
  const years = draws / DRAWS_PER_YEAR
  if (years < 1) {
    const weeks = Math.max(1, Math.round(years * WEEKS_PER_YEAR))
    return `${weeks} week${weeks === 1 ? '' : 's'}`
  }
  if (years < 10) {
    const value = Number(years.toFixed(1))
    return `${value} year${value === 1 ? '' : 's'}`
  }
  return `${formatCount(years)} years`
}
