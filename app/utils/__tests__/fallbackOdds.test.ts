import { describe, it, expect } from 'vitest'
import { FALLBACK_EUROJACKPOT_ODDS } from '../fallbackOdds'
import { eurojackpotHistoricOddsSchema } from '../../schemas/winning'

describe('fallbackOdds', () => {
  it('should export valid fallback odds that pass schema validation', () => {
    // Should not throw
    const validatedOdds = eurojackpotHistoricOddsSchema.parse(
      FALLBACK_EUROJACKPOT_ODDS
    )

    // Should have all required properties
    expect(validatedOdds.eurojackpotGameCycle).toBeDefined()
    expect(validatedOdds.eurojackpotOdds).toHaveLength(12)
    expect(validatedOdds.eurojackpotTurnover).toBeDefined()

    // Should have canonical key
    expect(validatedOdds.eurojackpotGameCycle.key).toBe(
      'fallback-odds-canonical'
    )

    // Should have correct winning classes (1-12)
    validatedOdds.eurojackpotOdds.forEach((odd, index) => {
      expect(odd.winningClass).toBe(index + 1)
      expect(odd.amount).toBeGreaterThan(0)
      expect(odd.numberOfWins).toBeGreaterThanOrEqual(0)
    })

    // First class should be jackpot
    expect(validatedOdds.eurojackpotOdds[0].jackpot).toBe(true)

    // Others should not be jackpot
    validatedOdds.eurojackpotOdds.slice(1).forEach((odd) => {
      expect(odd.jackpot).toBe(false)
    })
  })

  it('should use realistic payout amounts based on real draw data', () => {
    // Class 1 (jackpot) should be substantial
    expect(FALLBACK_EUROJACKPOT_ODDS.eurojackpotOdds[0].amount).toBeGreaterThan(
      30000000
    )

    // Class 12 (lowest) should be reasonable
    expect(FALLBACK_EUROJACKPOT_ODDS.eurojackpotOdds[11].amount).toBe(10.0)

    // Should have realistic turnover
    expect(
      FALLBACK_EUROJACKPOT_ODDS.eurojackpotTurnover[0].amount
    ).toBeGreaterThan(40000000)
  })
})
