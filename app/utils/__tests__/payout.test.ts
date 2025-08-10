import { describe, it, expect } from 'vitest'
import { buildOddsMap } from '../payout'

describe('payout buildOddsMap', () => {
  it('returns a map for classes 1-12 with non-negative amounts', () => {
    const map = buildOddsMap({
      eurojackpotGameCycle: {
        cycleNo: 1,
        cycleYear: 2025,
        eventDate: Date.now(),
        eventWeekday: 5,
        gametableValidFrom: null,
        gametableValidTo: null,
        key: 'x',
        variantNo: 1,
      },
      eurojackpotOdds: [
        {
          amount: 100,
          numberOfWins: 0,
          winningClass: 1,
          sequence: 1,
          jackpot: true,
        },
        {
          amount: 0,
          numberOfWins: 0,
          winningClass: 12,
          sequence: 12,
          jackpot: false,
        },
      ],
      eurojackpotTurnover: [{ amount: 0, jurisdiction: 0 }],
    })
    expect(map.get(1)).toBe(100)
    expect(map.get(12)).toBe(0)
  })
})
