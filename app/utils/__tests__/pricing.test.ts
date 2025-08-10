import { describe, it, expect } from 'vitest'
import { systemPrice, PRICE_PER_LINE } from '../pricing'
import { combinationCount } from '../combinatorics'

describe('pricing', () => {
  it('systemPrice equals combinationCount * PRICE_PER_LINE', () => {
    const m = 6, e = 3
    expect(systemPrice(m, e)).toBe(combinationCount(m, e) * PRICE_PER_LINE)
  })
})