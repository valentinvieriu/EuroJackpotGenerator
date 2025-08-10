import { defineEventHandler } from 'h3'
import { generateEurojackpotUrl, EurojackpotDrawType } from '~/utils/dateUtils'
import {
  fetchWinningDataResponseSchema,
  type FetchWinningDataResponse,
} from '~/schemas'
import {
  validateExternalResponse,
  validateOutput,
  handleEndpointError,
  fetchWithTimeout,
} from '../utils/validation'

/**
 * API endpoint handler to fetch the latest available EuroJackpot winning numbers and odds data.
 * Validates input/output at the edges and handles all error cases properly.
 */
export default defineEventHandler(
  async (): Promise<FetchWinningDataResponse> => {
    try {
      // 1. Generate URL for external API
      const url = generateEurojackpotUrl(EurojackpotDrawType.PREVIOUS)
      console.log(`Attempting to fetch winning data from: ${url}`)

      // 2. Fetch from external API with timeout
      const response = await fetchWithTimeout(url, {
        timeout: 8000,
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        console.warn('Failed to fetch current odds, using fallback data')
        return getFallbackWinningData()
      }

      // 3. Parse and validate external response
      const rawData = await response.json()
      const validatedData = validateExternalResponse(
        fetchWinningDataResponseSchema,
        rawData,
        'Lotto Bayern API'
      )

      console.log('Winning data fetched and validated successfully.')

      // 4. Validate output at the edge
      return validateOutput(
        fetchWinningDataResponseSchema,
        validatedData,
        'winning data response'
      )
    } catch (error: unknown) {
      // If external validation fails, fall back to local data
      if (
        error &&
        typeof error === 'object' &&
        'statusCode' in error &&
        error.statusCode === 502
      ) {
        console.warn('Using fallback winning data due to external API error')
        return getFallbackWinningData()
      }

      handleEndpointError(error, '/api/fetchWinningData')
    }
  }
)

/**
 * Provides a hardcoded set of fallback EuroJackpot odds data.
 * This is used if the live API fetch fails. The winning classes are already normalized (1-12).
 */
function getFallbackWinningData(): FetchWinningDataResponse {
  const fallbackDate = new Date()
  const fallbackTimestamp = fallbackDate.getTime()

  return {
    eurojackpotGameCycle: {
      cycleNo: 0,
      cycleYear: fallbackDate.getFullYear(),
      eventDate: fallbackTimestamp,
      eventWeekday: fallbackDate.getDay(),
      gametableValidFrom: null,
      gametableValidTo: null,
      key: 'fallback-data-key',
      variantNo: 0,
    },
    eurojackpotOdds: [
      {
        amount: 10000000.0,
        numberOfWins: 0,
        winningClass: 1,
        sequence: 1,
        jackpot: true,
      },
      {
        amount: 750000.0,
        numberOfWins: 1,
        winningClass: 2,
        sequence: 2,
        jackpot: false,
      },
      {
        amount: 100000.0,
        numberOfWins: 3,
        winningClass: 3,
        sequence: 3,
        jackpot: false,
      },
      {
        amount: 5000.0,
        numberOfWins: 20,
        winningClass: 4,
        sequence: 4,
        jackpot: false,
      },
      {
        amount: 300.0,
        numberOfWins: 500,
        winningClass: 5,
        sequence: 5,
        jackpot: false,
      },
      {
        amount: 100.0,
        numberOfWins: 1000,
        winningClass: 6,
        sequence: 6,
        jackpot: false,
      },
      {
        amount: 50.0,
        numberOfWins: 2000,
        winningClass: 7,
        sequence: 7,
        jackpot: false,
      },
      {
        amount: 20.0,
        numberOfWins: 10000,
        winningClass: 8,
        sequence: 8,
        jackpot: false,
      },
      {
        amount: 15.0,
        numberOfWins: 15000,
        winningClass: 9,
        sequence: 9,
        jackpot: false,
      },
      {
        amount: 12.0,
        numberOfWins: 25000,
        winningClass: 10,
        sequence: 10,
        jackpot: false,
      },
      {
        amount: 10.0,
        numberOfWins: 50000,
        winningClass: 11,
        sequence: 11,
        jackpot: false,
      },
      {
        amount: 8.0,
        numberOfWins: 100000,
        winningClass: 12,
        sequence: 12,
        jackpot: false,
      },
    ],
    eurojackpotTurnover: [{ amount: 50000000.0, jurisdiction: 0 }],
  }
}
