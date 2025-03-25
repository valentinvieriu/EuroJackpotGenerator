import { H3Error, createError } from 'h3';
import { generateEurojackpotUrl, EurojackpotDrawType } from '~/utils/dateUtils'; // Import enum too
import type { EurojackpotHistoricOdds, WinningClass } from "~/types/winning";

/**
 * Normalizes a winning class object fetched from the API.
 * The source API sometimes uses class numbers like 101, 102,... 112 for classes 1-12.
 * This function converts them to the standard 1-12 format.
 * It handles potential non-standard values gracefully.
 *
 * @param odd The original WinningClass object from the API response.
 * @returns A new WinningClass object with the `winningClass` property normalized to 1-12.
 *          Returns the original object if normalization is not needed or applicable.
 */
const normalizeWinningClass = (odd: WinningClass): WinningClass => {
  // Check if winningClass is a number and greater than 100 (the pattern observed)
  if (typeof odd.winningClass === 'number' && odd.winningClass > 100 && odd.winningClass <= 112) {
    return {
      ...odd,
      winningClass: odd.winningClass - 100, // Normalize (e.g., 101 -> 1)
    };
  }
  // Return the original object if it's already 1-12 or doesn't match the pattern
  return odd;
};

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
export default defineEventHandler(async (event): Promise<EurojackpotHistoricOdds> => {
  let data: EurojackpotHistoricOdds | null = null;
  let fetchError: Error | null = null; // Store specific error for logging fallback reason
  const controller = new AbortController(); // For implementing fetch timeout
  const timeoutDuration = 8000; // 8 seconds timeout

  // Set timeout to abort the fetch request if it takes too long
  const timeoutId = setTimeout(() => {
    console.warn(`Fetch timeout triggered after ${timeoutDuration}ms.`);
    controller.abort();
  }, timeoutDuration);

  try {
    // Generate the URL for the *previous* draw relative to today.
    const url = generateEurojackpotUrl(EurojackpotDrawType.PREVIOUS);
    console.log(`Attempting to fetch winning data from: ${url}`);

    // Fetch data from the external API
    const response = await fetch(url, { 
      signal: controller.signal, // Link fetch to the AbortController
      headers: { Accept: 'application/json' }, // Request JSON response
      // Consider cache-control headers if needed, e.g., 'Cache-Control': 'no-cache'
    });

    // Clear the timeout timer as the fetch completed (successfully or not)
    clearTimeout(timeoutId);

    // --- Handle HTTP Response ---
    if (!response.ok) {
       // Try to get more details from the response body for better error diagnosis
      let errorBody = `(Status: ${response.status})`;
      try {
        errorBody = await response.text();
      } catch (e) { /* Ignore error reading body */ }
      throw new Error(`HTTP error fetching winning data: ${response.status}. Body: ${errorBody}`);
    }

    // --- Parse and Validate JSON ---
    const responseData = await response.json() as unknown; // Parse as unknown first for safety

    // Basic validation: Check if it's an object and has the expected top-level keys
    if (typeof responseData !== 'object' || responseData === null || !('eurojackpotGameCycle' in responseData) || !('eurojackpotOdds' in responseData)) {
         throw new Error('Fetched data is not a valid EurojackpotHistoricOdds object.');
    }
     // Now we can safely cast
     data = responseData as EurojackpotHistoricOdds;

    console.log('Winning data fetched successfully.');

    // --- Normalize Winning Classes ---
    if (data && Array.isArray(data.eurojackpotOdds)) {
      data.eurojackpotOdds = data.eurojackpotOdds.map(normalizeWinningClass);
      console.log('Winning classes normalized (if necessary).');
    } else {
      // This case indicates a problem with the fetched data structure even after basic validation.
      console.warn('Fetched data is missing or has an invalid eurojackpotOdds array. Proceeding, but calculations might fail.');
      // data might still be returned, but subsequent processing should be robust
    }

    // --- Return successfully fetched and processed data ---
    return data;

  } catch (error: unknown) {
    // Clear timeout just in case error occurred before fetch completed but after timeout was set
     clearTimeout(timeoutId);

    if (error instanceof H3Error) {
      throw error; // Re-throw H3 specific errors directly
    }

    // Handle fetch errors (including AbortError from timeout) and parsing/validation errors
    fetchError = error instanceof Error ? error : new Error(String(error)); // Store the error
    console.error(`Error during winning data fetch or processing: ${fetchError.message}`);
    // Fallback mechanism will be triggered below as 'data' is still null.
  }

  // --- Fallback Mechanism ---
  // If 'data' is still null at this point, it means the try block failed.
  if (!data) {
    console.warn(`Using fallback winning data due to error: ${fetchError?.message ?? 'Unknown error'}`);
    data = getFallbackWinningData(); // Use the predefined fallback data
  }

  // Return either the successfully fetched/normalized data or the fallback data.
  return data;
});


/**
 * Provides a hardcoded set of fallback EuroJackpot odds data.
 * This is used if the live API fetch fails. The winning classes are already normalized (1-12).
 * Amounts are representative estimates and may not reflect actual recent jackpots/payouts.
 *
 * @returns A complete EurojackpotHistoricOdds object with fallback values.
 */
function getFallbackWinningData(): EurojackpotHistoricOdds {
  const fallbackDate = new Date(); // Use current date for fallback context
  // Ensure timestamps are numbers or null
  const fallbackTimestamp = fallbackDate.getTime();

  return {
    eurojackpotGameCycle: {
      cycleNo: 0, // Placeholder
      cycleYear: fallbackDate.getFullYear(),
      eventDate: fallbackTimestamp, // Example timestamp
      eventWeekday: fallbackDate.getDay(), // Example weekday
      gametableValidFrom: null, // Or a placeholder timestamp if needed
      gametableValidTo: null,   // Or a placeholder timestamp if needed
      key: "fallback-data-key", // Identifier for fallback
      variantNo: 0, // Placeholder
    },
    // Odds using standard winningClass 1-12 and estimated amounts
    eurojackpotOdds: [
      { amount: 10000000.00, numberOfWins: 0, winningClass: 1, sequence: 1, jackpot: true },
      { amount: 750000.00, numberOfWins: 1, winningClass: 2, sequence: 2, jackpot: false }, // Example wins > 0
      { amount: 100000.00, numberOfWins: 3, winningClass: 3, sequence: 3, jackpot: false },
      { amount: 5000.00, numberOfWins: 20, winningClass: 4, sequence: 4, jackpot: false },
      { amount: 300.00, numberOfWins: 500, winningClass: 5, sequence: 5, jackpot: false },
      { amount: 100.00, numberOfWins: 1000, winningClass: 6, sequence: 6, jackpot: false },
      { amount: 50.00, numberOfWins: 2000, winningClass: 7, sequence: 7, jackpot: false },
      { amount: 20.00, numberOfWins: 10000, winningClass: 8, sequence: 8, jackpot: false },
      { amount: 15.00, numberOfWins: 15000, winningClass: 9, sequence: 9, jackpot: false },
      { amount: 12.00, numberOfWins: 25000, winningClass: 10, sequence: 10, jackpot: false },
      { amount: 10.00, numberOfWins: 50000, winningClass: 11, sequence: 11, jackpot: false },
      { amount: 8.00, numberOfWins: 100000, winningClass: 12, sequence: 12, jackpot: false },
    ],
    // Turnover data might be less critical for fallback, provide placeholders
    eurojackpotTurnover: [
      { amount: 50000000.00, jurisdiction: 0 }, // Example overall turnover
    ],
  };
}