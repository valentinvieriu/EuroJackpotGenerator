import { generateEurojackpotUrl, EurojackpotDrawType } from '~/utils/dateUtils'
import { eurojackpotHistoricOddsSchema } from '~/schemas/winning'
import type { EurojackpotHistoricOdds } from '~/schemas/winning'
import {
  validateExternalResponse,
  validateOutput,
  fetchWithTimeout,
} from './validation'
import { FALLBACK_EUROJACKPOT_ODDS } from '~/utils/fallbackOdds'
import { logger } from '~/utils/logger'

/**
 * Options for fetchWinningData function
 */
export interface FetchWinningDataOptions {
  /**
   * Whether to validate output at the edge (used by standalone endpoint)
   * @default false
   */
  validateOutput?: boolean
  /**
   * Request timeout in milliseconds
   * @default 8000
   */
  timeout?: number
}

/**
 * Centralized function to fetch and validate EuroJackpot winning data.
 * Handles timeout, validation, normalization, and fallback logic.
 *
 * @param options Configuration options for the fetch operation
 * @returns Promise resolving to validated and normalized winning data
 */
export async function fetchWinningData(
  options: FetchWinningDataOptions = {}
): Promise<EurojackpotHistoricOdds> {
  const { validateOutput: shouldValidateOutput = false, timeout = 8000 } =
    options

  try {
    // 1. Generate URL for external API
    const url = generateEurojackpotUrl(EurojackpotDrawType.PREVIOUS)
    logger.debug(`Fetching winning data from: ${url}`)

    // 2. Fetch from external API with timeout
    const response = await fetchWithTimeout(url, {
      timeout,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      logger.warn('Failed to fetch current odds, using fallback data')
      return FALLBACK_EUROJACKPOT_ODDS
    }

    // 3. Parse and validate external response
    const rawData = await response.json()
    const validatedData = validateExternalResponse(
      eurojackpotHistoricOddsSchema,
      rawData,
      'Lotto Bayern API'
    )

    logger.info('Winning data fetched and validated successfully')

    // 4. Optional output validation for edge cases
    if (shouldValidateOutput) {
      return validateOutput(
        eurojackpotHistoricOddsSchema,
        validatedData,
        'winning data response'
      )
    }

    return validatedData
  } catch (error: unknown) {
    // If external validation fails, fall back to local data
    if (
      error &&
      typeof error === 'object' &&
      'statusCode' in error &&
      error.statusCode === 502
    ) {
      logger.warn('Using fallback winning data due to external API error')
      return FALLBACK_EUROJACKPOT_ODDS
    }

    // On any other error (timeout, validation, network), use fallback
    logger.warn('Error fetching winning data, using fallback:', error)
    return FALLBACK_EUROJACKPOT_ODDS
  }
}
