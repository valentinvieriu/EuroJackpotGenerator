import { H3Error } from 'h3'
import { generateEurojackpotUrl, EurojackpotDrawType } from '~/utils/dateUtils'
import {
  eurojackpotHistoricOddsSchema,
  type EurojackpotHistoricOdds,
} from '~/schemas'

/**
 * NOTE: Winning class normalization now lives in `~/utils/odds.ts` as a shared utility.
 */

/**
 * API endpoint handler to fetch the latest available EuroJackpot winning numbers and odds data.
 * - Fetches data for the most recent 'previous' draw using the Lotto Bayern API URL structure.
 * - Includes a fetch timeout.
 * - Normalizes the winning class numbers (e.g., 101 -> 1).
 * - Provides hardcoded fallback data if the API fetch fails or returns invalid data.
 *
 * @param event The H3 event object.
 * @returns A promise resolving to the EurojackpotHistoricOdds object (either fetched or fallback).
 * @throws {H3Error} Propagates H3-specific errors. For general errors, logs them and returns fallback data.
 */
export default defineEventHandler(
  async (_event): Promise<EurojackpotHistoricOdds> => {
    let data: EurojackpotHistoricOdds | null = null
    let fetchError: Error | null = null // Store specific error for logging fallback reason
    const controller = new AbortController() // For implementing fetch timeout
    const timeoutDuration = 8000 // 8 seconds timeout

    // Set timeout to abort the fetch request if it takes too long
    const timeoutId = setTimeout(() => {
      console.warn(`Fetch timeout triggered after ${timeoutDuration}ms.`)
      controller.abort()
    }, timeoutDuration)

    try {
      // Generate the URL for the *previous* draw relative to today.
      const url = generateEurojackpotUrl(EurojackpotDrawType.PREVIOUS)
      console.log(`Attempting to fetch winning data from: ${url}`)

      // Fetch data from the external API
      const response = await fetch(url, {
        signal: controller.signal, // Link fetch to the AbortController
        headers: { Accept: 'application/json' }, // Request JSON response
        // Consider cache-control headers if needed, e.g., 'Cache-Control': 'no-cache'
      })

      // Clear the timeout timer as the fetch completed (successfully or not)
      clearTimeout(timeoutId)

      // --- Handle HTTP Response ---
      if (!response.ok) {
        // Try to get more details from the response body for better error diagnosis
        let errorBody = `(Status: ${response.status})`
        try {
          errorBody = await response.text()
        } catch {
          /* Ignore error reading body */
        }
        throw new Error(
          `HTTP error fetching winning data: ${response.status}. Body: ${errorBody}`
        )
      }

      // --- Parse and Validate JSON with Zod ---
      const rawData = await response.json()
      const parseResult = eurojackpotHistoricOddsSchema.safeParse(rawData)

      if (!parseResult.success) {
        // For external API errors, we'll use fallback rather than throwing
        console.warn(
          'External API returned invalid data:',
          parseResult.error?.errors || parseResult.error
        )
        throw new Error(
          `External API returned invalid data: ${parseResult.error?.message || 'Unknown validation error'}`
        )
      }

      data = parseResult.data
      console.log('Winning data fetched and validated successfully.')

      // --- Return successfully fetched and processed data ---
      return data
    } catch (error: unknown) {
      // Clear timeout just in case error occurred before fetch completed but after timeout was set
      clearTimeout(timeoutId)

      if (error instanceof H3Error) {
        throw error // Re-throw H3 specific errors directly
      }

      // Handle fetch errors (including AbortError from timeout) and parsing/validation errors
      fetchError = error instanceof Error ? error : new Error(String(error)) // Store the error
      console.error(
        `Error during winning data fetch or processing: ${fetchError.message}`
      )
      // Fallback mechanism will be triggered below as 'data' is still null.
    }

    // --- Fallback Mechanism ---
    // If 'data' is still null at this point, it means the try block failed.
    if (!data) {
      console.warn(
        `Using fallback winning data due to error: ${fetchError?.message ?? 'Unknown error'}`
      )
      data = getFallbackWinningData() // Use the predefined fallback data
    }

    // Return either the successfully fetched/normalized data or the fallback data.
    return data
  }
)

/**
 * Provides a hardcoded set of fallback EuroJackpot odds data.
 * This is used if the live API fetch fails. The winning classes are already normalized (1-12).
 * Amounts are representative estimates and may not reflect actual recent jackpots/payouts.
 *
 * @returns A complete EurojackpotHistoricOdds object with fallback values.
 */
function getFallbackWinningData(): EurojackpotHistoricOdds {
  const fallbackDate = new Date() // Use current date for fallback context
  // Ensure timestamps are numbers or null
  const fallbackTimestamp = fallbackDate.getTime()

  return {
    eurojackpotGameCycle: {
      cycleNo: 0, // Placeholder
      cycleYear: fallbackDate.getFullYear(),
      eventDate: fallbackTimestamp, // Example timestamp
      eventWeekday: fallbackDate.getDay(), // Example weekday
      gametableValidFrom: null, // Or a placeholder timestamp if needed
      gametableValidTo: null, // Or a placeholder timestamp if needed
      key: 'fallback-data-key', // Identifier for fallback
      variantNo: 0, // Placeholder
    },
    // Odds using standard winningClass 1-12 and estimated amounts
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
      }, // Example wins > 0
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
    // Turnover data might be less critical for fallback, provide placeholders
    eurojackpotTurnover: [
      { amount: 50000000.0, jurisdiction: 0 }, // Example overall turnover
    ],
  }
}
