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
import { normalizeOdds } from '~/utils/odds'
import { FALLBACK_EUROJACKPOT_ODDS } from '~/utils/fallbackOdds'

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
        return normalizeOdds(FALLBACK_EUROJACKPOT_ODDS)
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
        return normalizeOdds(FALLBACK_EUROJACKPOT_ODDS)
      }

      handleEndpointError(error, '/api/fetchWinningData')
    }
  }
)
