import type { StatisticsData } from '~/schemas'
import { statisticsDataSchema } from '~/schemas/statistics'
import { fetchWithTimeout } from './validation'
import { logger } from '~/utils/logger'

// --- Server-Only Caching Mechanism ---
let cachedStats: StatisticsData | null = null
let lastFetchTime: number = 0 // Store timestamp of the last successful fetch
const CACHE_DURATION_MS: number = 10 * 60 * 1000 // Cache duration: 10 minutes in milliseconds

/**
 * SERVER-ONLY: Fetches EuroJackpot number frequency statistics from the Lotto Bayern API.
 * Implements a simple in-memory cache to avoid redundant requests.
 *
 * This function performs external HTTP fetches and MUST NOT be imported by client code.
 * It lives in server/utils/ to enforce server runtime boundaries.
 *
 * @returns A promise that resolves to the StatisticsData object if fetch is successful
 *          and data is valid, or null if fetching fails, data is invalid, or cache is used but empty.
 *          Returns cached data if available and not expired.
 */
export async function fetchStatistics(): Promise<StatisticsData | null> {
  const now = Date.now()

  // 1. Check cache validity
  if (cachedStats && now - lastFetchTime < CACHE_DURATION_MS) {
    logger.debug('Returning cached statistics data.')
    return cachedStats
  }

  // 2. Cache expired or not available, attempt to fetch new data
  try {
    logger.info('Fetching fresh statistics data...')
    const response = await fetchWithTimeout(
      // URL for fetching statistics sorted by number (ascending)
      'https://www.lotto-bayern.de/getEurojackpotStatisticsCounts?sorting=number',
      {
        // Headers typically required for JSON APIs
        headers: { Accept: 'application/json, text/plain, */*' },
        timeout: 10000, // 10 second timeout
      }
    )

    // Parse the JSON response body
    const statsData: unknown = await response.json()

    // 3. Validate the fetched data structure using shared schema
    const validatedData = statisticsDataSchema.safeParse(statsData)

    if (!validatedData.success) {
      // Log the invalid data structure for debugging purposes
      logger.error(
        'Fetched statistics data has invalid structure:',
        JSON.stringify(statsData)
      )
      throw new Error('Invalid statistics data structure received from API.')
    }

    // 4. Update cache and timestamp
    logger.info('Statistics data fetched and validated successfully.')
    cachedStats = validatedData.data // Store the valid data
    lastFetchTime = now // Update the timestamp of the successful fetch
    return cachedStats
  } catch (error: unknown) {
    // Log any errors during the fetch or processing
    logger.error(
      'Error fetching or processing statistics:',
      error instanceof Error ? error.message : String(error)
    )
    // In case of error, return null (or potentially the stale cache if desired, but null is safer)
    cachedStats = null // Invalidate cache on error
    lastFetchTime = 0
    return null
  }
}
