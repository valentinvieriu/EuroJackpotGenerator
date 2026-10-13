import { describe, it, expect } from 'vitest'
import {
  PRIZE_CLASSES,
  ANY_PRIZE_PROBABILITY,
  getPrizeClass,
  matchLabel,
  expectedHits,
  splitReturnByReach,
  LONG_RUN_RETURN,
  LONG_RUN_PRIZES,
  BOOSTER_FUND_RETURN,
} from '~/utils/prizeTable'
import { PRICE_PER_LINE } from '~/utils/pricing'
import { EUROJACKPOT_TOTAL_COMBINATIONS } from '~/utils/constants'

describe('PRIZE_CLASSES', () => {
  it('lists all 12 classes in order', () => {
    expect(PRIZE_CLASSES.map((c) => c.winClass)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ])
  })

  it('gives the jackpot exactly one combination', () => {
    expect(PRIZE_CLASSES[0]?.probability).toBeCloseTo(
      1 / EUROJACKPOT_TOTAL_COMBINATIONS,
      18
    )
  })

  it('matches the published odds for every class', () => {
    const publishedOneIn = [
      139838160, 6991908, 3107515, 621503, 31075, 14125, 13811, 985, 706, 314,
      188, 49,
    ]
    PRIZE_CLASSES.forEach((prizeClass, i) => {
      expect(Math.round(1 / prizeClass.probability)).toBe(publishedOneIn[i])
    })
  })

  it('sums to roughly a 1 in 32 chance of any prize', () => {
    expect(1 / ANY_PRIZE_PROBABILITY).toBeCloseTo(31.8, 1)
  })
})

describe('prize class helpers', () => {
  it('labels a class by its match', () => {
    expect(matchLabel(1)).toBe('5 + 2')
    expect(matchLabel(12)).toBe('2 + 1')
    expect(matchLabel(99)).toBe('Class 99')
  })

  it('looks a class up by number', () => {
    expect(getPrizeClass(7)).toMatchObject({ main: 4, euro: 0 })
    expect(getPrizeClass(13)).toBeUndefined()
  })

  it('scales expected hits with the number of lines', () => {
    expect(expectedHits(12, 10000)).toBeCloseTo(202.95, 1)
    expect(expectedHits(1, 10000)).toBeLessThan(0.001)
    expect(expectedHits(13, 10000)).toBe(0)
  })
})

describe('long-run payback by the rules', () => {
  const classTotal = PRIZE_CLASSES.reduce((sum, c) => sum + c.longRunReturn, 0)

  it('pays back half of every euro once the jackpot reserve is included', () => {
    expect(LONG_RUN_RETURN).toBe(0.5)
    expect(classTotal + BOOSTER_FUND_RETURN).toBeCloseTo(LONG_RUN_RETURN, 10)
  })

  it('prices every class so that all of them together pay back exactly half', () => {
    // Expected payout of one line, class by class, against its €2 stake
    const expectedPayout = PRIZE_CLASSES.reduce(
      (sum, c) => sum + c.probability * LONG_RUN_PRIZES[c.winClass]!,
      0
    )
    // Prizes are whole cents, so the total can be off by a few thousandths of a cent
    expect(expectedPayout / PRICE_PER_LINE).toBeCloseTo(LONG_RUN_RETURN, 3)
  })

  it('gives each class the prize its share of the stakes can afford', () => {
    for (const c of PRIZE_CLASSES) {
      const reserve = c.winClass === 1 ? BOOSTER_FUND_RETURN : 0
      const exact =
        ((c.longRunReturn + reserve) * PRICE_PER_LINE) / c.probability
      // To the nearest cent
      expect(Math.abs(LONG_RUN_PRIZES[c.winClass]! - exact)).toBeLessThan(
        0.0051
      )
    }
  })

  it('lands on realistic prizes, growing with the rarity of the match', () => {
    expect(LONG_RUN_PRIZES[12]).toBeCloseTo(10, 0) // 2 + 1
    expect(LONG_RUN_PRIZES[2]).toBeGreaterThan(500_000) // 5 + 1
    expect(LONG_RUN_PRIZES[2]).toBeLessThan(700_000)
    expect(LONG_RUN_PRIZES[1]).toBeGreaterThan(60_000_000) // jackpot
    expect(LONG_RUN_PRIZES[1]).toBeLessThan(65_000_000)
    // 4 + 0 is rarer than 3 + 2, so no strict order by class number: compare by odds
    const byRarity = [...PRIZE_CLASSES].sort(
      (a, b) => b.probability - a.probability
    )
    for (let i = 1; i < byRarity.length; i++) {
      expect(LONG_RUN_PRIZES[byRarity[i]!.winClass]!).toBeGreaterThan(
        LONG_RUN_PRIZES[byRarity[i - 1]!.winClass]!
      )
    }
  })

  it('puts the largest shares at the two ends: jackpot and smallest prize', () => {
    const ranked = [...PRIZE_CLASSES].sort(
      (a, b) => b.longRunReturn - a.longRunReturn
    )
    expect(ranked[0]?.winClass).toBe(1)
    expect(ranked[1]?.winClass).toBe(12)
    expect(getPrizeClass(1)?.longRunReturn).toBeCloseTo(0.18, 10)
    expect(getPrizeClass(12)?.longRunReturn).toBeCloseTo(0.1015, 10)
  })
})

describe('splitReturnByReach', () => {
  it('finds only the five smallest classes within reach of a typical run', () => {
    // 1,000 draws of 10 standard tickets
    const split = splitReturnByReach(10_000)
    expect(split.withinReach.map((c) => c.winClass)).toEqual([8, 9, 10, 11, 12])
    expect(split.returnWithinReach).toBeCloseTo(0.18925, 5)
    expect(split.returnOutOfReach).toBeCloseTo(0.31075, 5)
  })

  it('still expects a hit or two among the classes out of reach', () => {
    // Each of the seven rarest classes expects under one hit in 10,000 lines,
    // but together they expect nearly two
    const split = splitReturnByReach(10_000)
    expect(split.outOfReach).toHaveLength(7)
    expect(split.expectedHitsOutOfReach).toBeCloseTo(1.77, 2)
    expect(splitReturnByReach(1e9).expectedHitsOutOfReach).toBe(0)
  })

  it('always accounts for the whole long-run payback', () => {
    for (const lines of [1, 50, 10_000, 1_000_000, 1e9]) {
      const split = splitReturnByReach(lines)
      expect(split.returnWithinReach + split.returnOutOfReach).toBeCloseTo(
        LONG_RUN_RETURN,
        10
      )
      expect(split.withinReach.length + split.outOfReach.length).toBe(12)
    }
  })

  it('puts nothing within reach of a single line', () => {
    const split = splitReturnByReach(1)
    expect(split.withinReach).toHaveLength(0)
    expect(split.returnWithinReach).toBe(0)
  })

  it('never shrinks as the run grows, and reaches everything in the end', () => {
    const sizes = [10, 100, 1_000, 10_000, 100_000, 10_000_000, 1e9]
    let previous = -1
    for (const lines of sizes) {
      const { returnWithinReach } = splitReturnByReach(lines)
      expect(returnWithinReach).toBeGreaterThanOrEqual(previous)
      previous = returnWithinReach
    }
    const everything = splitReturnByReach(1e9)
    expect(everything.outOfReach).toHaveLength(0)
    expect(everything.returnWithinReach).toBeCloseTo(LONG_RUN_RETURN, 10)
  })

  it('counts the jackpot reserve only once the jackpot itself is reachable', () => {
    // Enough lines for class 2 but not for the jackpot
    const split = splitReturnByReach(10_000_000)
    expect(split.outOfReach.map((c) => c.winClass)).toEqual([1])
    expect(split.returnOutOfReach).toBeCloseTo(0.18 + BOOSTER_FUND_RETURN, 10)
  })
})
