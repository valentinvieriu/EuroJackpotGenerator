import { describe, it, expect } from 'vitest'
import {
  nCr,
  combinationCount,
  calculateWinningLineCounts,
} from '../combinatorics'
import { determineWinClass } from '../winningClasses'

describe('combinatorics', () => {
  it('nCr basic values', () => {
    expect(nCr(5, 0)).toBe(1)
    expect(nCr(5, 1)).toBe(5)
    expect(nCr(5, 2)).toBe(10)
    expect(nCr(5, 5)).toBe(1)
    expect(nCr(10, 6)).toBe(nCr(10, 4)) // symmetry
  })

  it('combinationCount for Eurojackpot system lines', () => {
    // System 5/2: C(5,5)*C(2,2)=1
    expect(combinationCount(5, 2)).toBe(1)
    // System 6/3: C(6,5)*C(3,2)=6*3=18
    expect(combinationCount(6, 3)).toBe(18)
  })

  it('calculateWinningLineCounts maps to known classes', () => {
    // Ticket is a System 5/2 (m=5,e=2); if it matches 4 main + 1 euro, class is 5 -> 1 line
    const counts = calculateWinningLineCounts(5, 2, 4, 1)
    const winClass = determineWinClass(4, 1)!
    expect(counts[winClass]).toBe(1)
  })
})
