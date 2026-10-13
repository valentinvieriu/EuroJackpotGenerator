import { describe, it, expect } from 'vitest'
import {
  formatEuro,
  formatEuroCompact,
  formatCents,
  formatCount,
  formatOdds,
  formatPlayingTime,
} from '~/utils/format'

describe('formatEuro', () => {
  it('adds thousands separators and two decimals', () => {
    expect(formatEuro(20000)).toBe('€20,000.00')
    expect(formatEuro(4408.1)).toBe('€4,408.10')
  })

  it('puts a true minus sign before the currency symbol', () => {
    expect(formatEuro(-20)).toBe('−€20.00')
    expect(formatEuro(-15591.9)).toBe('−€15,591.90')
  })

  it('only prefixes "+" when asked, and never on zero', () => {
    expect(formatEuro(4.5)).toBe('€4.50')
    expect(formatEuro(4.5, { sign: true })).toBe('+€4.50')
    expect(formatEuro(0, { sign: true })).toBe('€0.00')
  })

  it('does not render negative zero', () => {
    expect(formatEuro(-0.001)).toBe('€0.00')
    expect(formatEuro(-0.001, { sign: true })).toBe('€0.00')
  })

  it('respects the decimals option', () => {
    expect(formatEuro(1234.56, { decimals: 0 })).toBe('€1,235')
  })

  it('renders a dash for non-finite amounts', () => {
    expect(formatEuro(Infinity)).toBe('—')
    expect(formatEuro(Number.NaN)).toBe('—')
  })
})

describe('formatEuroCompact', () => {
  it('abbreviates thousands and millions', () => {
    expect(formatEuroCompact(950)).toBe('€950')
    expect(formatEuroCompact(1500)).toBe('€1.5k')
    expect(formatEuroCompact(20000)).toBe('€20k')
    expect(formatEuroCompact(1_200_000)).toBe('€1.2M')
  })

  it('keeps the sign in front', () => {
    expect(formatEuroCompact(-5000)).toBe('−€5k')
  })
})

describe('formatCount / formatOdds', () => {
  it('formats counts with separators', () => {
    expect(formatCount(139838160)).toBe('139,838,160')
  })

  it('formats probabilities as "1 in N"', () => {
    expect(formatOdds(1 / 139838160)).toBe('1 in 139,838,160')
    expect(formatOdds(0)).toBe('—')
  })
})

describe('formatPlayingTime', () => {
  it('uses weeks below one year', () => {
    expect(formatPlayingTime(1)).toBe('1 week')
    expect(formatPlayingTime(52)).toBe('26 weeks')
  })

  it('uses one decimal for single-digit years', () => {
    expect(formatPlayingTime(104)).toBe('1 year')
    expect(formatPlayingTime(1000)).toBe('9.6 years')
  })

  it('rounds to whole years from ten years up', () => {
    expect(formatPlayingTime(10000)).toBe('96 years')
  })

  it('groups the thousands of very long runs', () => {
    expect(formatPlayingTime(10_000_000)).toBe('96,154 years')
  })
})

describe('formatCents', () => {
  it('turns a per-euro fraction into cents', () => {
    expect(formatCents(0.5)).toBe('50¢')
    expect(formatCents(0.18925)).toBe('19¢')
    expect(formatCents(0.18925, 1)).toBe('18.9¢')
    expect(formatCents(0.004, 1)).toBe('0.4¢')
  })

  it('renders a dash for non-finite input', () => {
    expect(formatCents(Number.NaN)).toBe('—')
  })
})
