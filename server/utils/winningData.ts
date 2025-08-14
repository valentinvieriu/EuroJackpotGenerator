import { generateEurojackpotUrl, EurojackpotDrawType } from '~/utils/dateUtils'
import { eurojackpotHistoricOddsSchema } from '~/schemas/winning'
import type { EurojackpotHistoricOdds } from '~/schemas/winning'
import {
  validateExternalResponse,
  validateOutput,
  fetchWithTimeout,
} from './validation'
import { normalizeOdds } from '~/utils/odds'
import { FALLBACK_EUROJACKPOT_ODDS } from '~/utils/fallbackOdds'

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
    console.log(`Fetching winning data from: ${url}`)

    // 2. Fetch from external API with timeout
    const response = await fetchWithTimeout(url, {
      timeout,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      console.warn(
        'Failed to fetch current odds, using normalized fallback data'
      )
      return normalizeOdds(FALLBACK_EUROJACKPOT_ODDS)
    }

    // 3. Parse and validate external response
    const rawData = await response.json()
    const validatedData = validateExternalResponse(
      eurojackpotHistoricOddsSchema,
      rawData,
      'Lotto Bayern API'
    )

    // 4. Normalize odds data (handles both 1-12 and 101-112 win class formats)
    const normalizedData = normalizeOdds(validatedData)

    console.log('Winning data fetched and validated successfully')

    // 5. Optional output validation for edge cases
    if (shouldValidateOutput) {
      return validateOutput(
        eurojackpotHistoricOddsSchema,
        normalizedData,
        'winning data response'
      )
    }

    return normalizedData
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

    // On any other error (timeout, validation, network), use normalized fallback
    console.warn(
      'Error fetching winning data, using normalized fallback:',
      error
    )
    return normalizeOdds(FALLBACK_EUROJACKPOT_ODDS)
  }
}
