import { generateRandomNumbers } from '~/utils/numberGenerator'
import { H3Error, createError, defineEventHandler } from 'h3'
import {
  // Import constants for range and count of standard winning numbers
  MAIN_NUMBER_MIN,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MIN,
  EURO_NUMBER_MAX,
  MAIN_NUMBERS_COUNT, // Standard draw: 5 main numbers
  EURO_NUMBERS_COUNT, // Standard draw: 2 euro numbers
} from '~/utils/constants'
// Import Ticket type for defining return structure

/**
 * Defines the structure of the simulation result returned by the API.
 * Contains the randomly generated winning main and euro numbers for a standard draw.
 */
interface SimulationResult {
  /** Array of randomly generated main winning numbers (sorted). */
  mainNumbers: number[]
  /** Array of randomly generated euro winning numbers (sorted). */
  euroNumbers: number[]
}

/**
 * API endpoint handler to simulate a standard EuroJackpot draw.
 * Generates a set of random winning numbers (5 main, 2 euro) according to official rules.
 * Does not use historical statistics for generation; it simulates a truly random draw.
 *
 * @param event The H3 event object (unused in this handler but part of the signature).
 * @returns A promise resolving to a SimulationResult object containing the generated winning numbers.
 * @throws {H3Error} Throws a 500 error if number generation fails unexpectedly.
 */
export default defineEventHandler(async (_event): Promise<SimulationResult> => {
  try {
    // Generate the standard count of main numbers (5) within the allowed range (1-50).
    const mainNumbers = generateRandomNumbers(
      MAIN_NUMBERS_COUNT, // Use constant for count (5)
      MAIN_NUMBER_MIN,
      MAIN_NUMBER_MAX
    )

    // Generate the standard count of euro numbers (2) within the allowed range (1-12).
    const euroNumbers = generateRandomNumbers(
      EURO_NUMBERS_COUNT, // Use constant for count (2)
      EURO_NUMBER_MIN,
      EURO_NUMBER_MAX
    )

    // Log the simulated draw result on the server (optional)
    // console.log(`Simulated draw: Main=[${mainNumbers.join(',')}] Euro=[${euroNumbers.join(',')}]`);

    // Return the generated numbers in the defined structure.
    // generateRandomNumbers already sorts the arrays.
    return {
      mainNumbers,
      euroNumbers,
    }
  } catch (error: unknown) {
    // Log the detailed error on the server-side
    console.error(
      'Error simulating extraction in /api/simulate endpoint:',
      error
    )

    // If it's already an H3Error (though unlikely from generateRandomNumbers unless range/count is invalid), re-throw it.
    if (error instanceof H3Error) {
      throw error
    }

    // For other unexpected errors from generateRandomNumbers, return a generic 500 error.
    throw createError({
      statusCode: 500,
      statusMessage:
        'An internal server error occurred during draw simulation.',
      // Optionally include original error message in data for debugging
      data: { message: error instanceof Error ? error.message : String(error) },
    })
  }
})
