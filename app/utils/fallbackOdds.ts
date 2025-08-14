import type { EurojackpotHistoricOdds } from '../schemas'
import { eurojackpotHistoricOddsSchema } from '../schemas/winning'

/**
 * Creates canonical fallback EuroJackpot odds data when external API is unavailable.
 *
 * This provides a single source of truth for fallback payout amounts across
 * all endpoints (client store, server APIs) to ensure consistent ROI calculations
 * between single-draw and Monte Carlo simulations.
 *
 * Based on real EuroJackpot draw data from 2025-32-5 (Friday, August 8, 2025).
 * Uses original 101-112 winning class format - schema handles normalization to 1-12.
 */
function createFallbackOdds(): EurojackpotHistoricOdds {
  const rawData = {
    eurojackpotGameCycle: {
      cycleNo: 32,
      cycleYear: 2025,
      eventDate: 1754604000000, // Friday, August 8, 2025
      eventWeekday: 5, // Friday
      gametableValidFrom: null,
      gametableValidTo: null,
      key: 'fallback-odds-canonical',
      variantNo: 103,
    },
    eurojackpotOdds: [
      {
        amount: 36553237.2,
        numberOfWins: 1,
        winningClass: 101,
        sequence: 1,
        jackpot: true,
      },
      {
        amount: 1016401.1,
        numberOfWins: 2,
        winningClass: 102,
        sequence: 2,
        jackpot: false,
      },
      {
        amount: 143300.7,
        numberOfWins: 8,
        winningClass: 103,
        sequence: 3,
        jackpot: false,
      },
      {
        amount: 5252.7,
        numberOfWins: 36,
        winningClass: 104,
        sequence: 4,
        jackpot: false,
      },
      {
        amount: 287.2,
        numberOfWins: 823,
        winningClass: 105,
        sequence: 5,
        jackpot: false,
      },
      {
        amount: 170.0,
        numberOfWins: 1529,
        winningClass: 106,
        sequence: 6,
        jackpot: false,
      },
      {
        amount: 50.8,
        numberOfWins: 3722,
        winningClass: 107,
        sequence: 7,
        jackpot: false,
      },
      {
        amount: 27.8,
        numberOfWins: 21647,
        winningClass: 108,
        sequence: 8,
        jackpot: false,
      },
      {
        amount: 19.4,
        numberOfWins: 34560,
        winningClass: 109,
        sequence: 9,
        jackpot: false,
      },
      {
        amount: 16.3,
        numberOfWins: 77868,
        winningClass: 110,
        sequence: 10,
        jackpot: false,
      },
      {
        amount: 14.1,
        numberOfWins: 112946,
        winningClass: 111,
        sequence: 11,
        jackpot: false,
      },
      {
        amount: 10.0,
        numberOfWins: 479492,
        winningClass: 112,
        sequence: 12,
        jackpot: false,
      },
    ],
    eurojackpotTurnover: [
      { amount: 47274472.0, jurisdiction: 0 },
      { amount: 0, jurisdiction: 2 }, // Normalized from -1.00
    ],
  }

  // Validate against schema to ensure data integrity
  try {
    return eurojackpotHistoricOddsSchema.parse(rawData)
  } catch (error) {
    console.error('Fallback odds validation failed:', error)
    // If validation fails, throw error rather than returning potentially invalid data
    throw new Error('Invalid fallback odds data structure')
  }
}

/**
 * Canonical fallback EuroJackpot odds data validated against schema.
 * Based on real draw data from 2025-32-5. Schema normalizes 101-112 to 1-12.
 */
export const FALLBACK_EUROJACKPOT_ODDS: EurojackpotHistoricOdds =
  createFallbackOdds()
