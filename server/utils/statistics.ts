import type { StatisticsData } from '~/schemas'

// --- Server-Only Caching Mechanism ---
let cachedStats: StatisticsData | null = null
let lastFetchTime: number = 0 // Store timestamp of the last successful fetch
const CACHE_DURATION_MS: number = 10 * 60 * 1000 // Cache duration: 10 minutes in milliseconds

/**
 * Type guard to validate the structure of the fetched statistics data.
 * Checks if the data has the expected arrays 'numbers' and 'additionalNumbers'.
 *
 * @param data The data fetched from the API.
 * @returns True if the data conforms to the StatisticsData structure, false otherwise.
 */
const isValidStatisticsData = (data: unknown): data is StatisticsData => {
  // Check if data is an object and has the required properties which are arrays
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray((data as StatisticsData).numbers) &&
    (data as StatisticsData).numbers.length > 0 && // Ensure arrays are not empty
    Array.isArray((data as StatisticsData).additionalNumbers) &&
    (data as StatisticsData).additionalNumbers.length > 0
    // Add more checks here if needed (e.g., check item structure within arrays)
  )
}

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
    // console.log('Returning cached statistics data.');
    return cachedStats
  }

  // 2. Cache expired or not available, attempt to fetch new data
  try {
    console.log('Fetching fresh statistics data...')
    const response = await fetch(
      // URL for fetching statistics sorted by number (ascending)
      'https://www.lotto-bayern.de/getEurojackpotStatisticsCounts?sorting=number',
      {
        // Headers typically required for JSON APIs
        headers: { Accept: 'application/json, text/plain, */*' },
        // Consider adding a timeout via AbortController if needed
      }
    )

    // Check if the HTTP request was successful
    if (!response.ok) {
      throw new Error(
        `Failed to fetch statistics: HTTP status ${response.status}`
      )
    }

    // Parse the JSON response body
    const statsData: unknown = await response.json()

    // 3. Validate the fetched data structure
    if (!isValidStatisticsData(statsData)) {
      // Log the invalid data structure for debugging purposes
      console.error(
        'Fetched statistics data has invalid structure:',
        JSON.stringify(statsData)
      )
      throw new Error('Invalid statistics data structure received from API.')
    }

    // 4. Update cache and timestamp
    console.log('Statistics data fetched and validated successfully.')
    cachedStats = statsData // Store the valid data
    lastFetchTime = now // Update the timestamp of the successful fetch
    return cachedStats
  } catch (error: unknown) {
    // Log any errors during the fetch or processing
    console.error(
      'Error fetching or processing statistics:',
      error instanceof Error ? error.message : String(error)
    )
    // In case of error, return null (or potentially the stale cache if desired, but null is safer)
    cachedStats = null // Invalidate cache on error
    lastFetchTime = 0
    return null
  }
}
