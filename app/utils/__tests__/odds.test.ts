import { describe, it, expect } from 'vitest'
import { normalizeWinningClass, normalizeOdds } from '../odds'

describe('odds normalization', () => {
  it('normalizeWinningClass converts 101-112 to 1-12', () => {
    const normalized = normalizeWinningClass({
      amount: 0,
      numberOfWins: 0,
      winningClass: 105,
      sequence: 0,
      jackpot: false,
    })
    expect(normalized.winningClass).toBe(5)
  })

  it('normalizeOdds maps all entries', () => {
    const input = {
      eurojackpotOdds: [
        {
          amount: 0,
          numberOfWins: 0,
          winningClass: 101,
          sequence: 0,
          jackpot: false,
        },
        {
          amount: 0,
          numberOfWins: 0,
          winningClass: 112,
          sequence: 0,
          jackpot: false,
        },
      ],
    }
    const out = normalizeOdds(input)
    expect(out.eurojackpotOdds[0].winningClass).toBe(1)
    expect(out.eurojackpotOdds[1].winningClass).toBe(12)
  })
})
