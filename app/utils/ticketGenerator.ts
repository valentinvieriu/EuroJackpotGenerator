import { fetchStatistics } from './statisticsManager';
import { generateNumbers } from './numberGenerator';
import type { Ticket } from '~/types/ticket';
import type { StatisticsData } from '~/types/statistics';
import { MAIN_NUMBER_MIN, MAIN_NUMBER_MAX, EURO_NUMBER_MIN, EURO_NUMBER_MAX } from './constants';

// Global counter for assigning unique IDs to tickets across multiple generation requests within the same session.
// Note: This resets if the server restarts. For persistent IDs, a different approach would be needed.
let ticketIdCounter = 1;

/**
 * Generates a specified number of unique EuroJackpot tickets.
 * Numbers can be generated based on historical statistics (if available and fetched successfully) or purely randomly.
 * Ensures that no two tickets generated in the *same batch* have the identical combination of main and euro numbers.
 *
 * @param ticketCount The number of tickets to generate. Must be a positive integer.
 * @param mainCount The number of main numbers required per ticket (e.g., 5 for standard, more for system).
 * @param euroCount The number of euro numbers required per ticket (e.g., 2 for standard, more for system).
 * @returns A promise that resolves to an array of generated Ticket objects, each with a unique ID and sorted numbers.
 * @throws Error if `ticketCount` is invalid, or if max retries are exceeded while generating a unique ticket combination (indicating potential issues).
 */
export async function generateTickets(
  ticketCount: number,
  mainCount: number,
  euroCount: number
): Promise<Ticket[]> {
  // Basic validation for inputs
  if (!Number.isInteger(ticketCount) || ticketCount <= 0) {
    throw new Error('ticketCount must be a positive integer.');
  }
  if (!Number.isInteger(mainCount) || mainCount < MAIN_NUMBER_MIN || mainCount > MAIN_NUMBER_MAX) {
     throw new Error(`mainCount must be an integer between ${MAIN_NUMBER_MIN} and ${MAIN_NUMBER_MAX}.`);
  }
    if (!Number.isInteger(euroCount) || euroCount < EURO_NUMBER_MIN || euroCount > EURO_NUMBER_MAX) {
     throw new Error(`euroCount must be an integer between ${EURO_NUMBER_MIN} and ${EURO_NUMBER_MAX}.`);
  }


  let statsData: StatisticsData | null = null;
  try {
    // Attempt to fetch statistics for weighted number generation.
    statsData = await fetchStatistics();
     if (!statsData) {
        console.warn('Statistics data unavailable, proceeding with purely random number generation.');
     }
  } catch (error) {
    // Log the error but continue with random generation as a fallback.
    console.error('Failed to fetch statistics, using purely random generation:', error instanceof Error ? error.message : String(error));
    // statsData remains null
  }

  const generatedTickets: Ticket[] = [];
  // Use a Set to efficiently track unique combinations generated within this batch.
  // The key combines sorted main numbers and sorted euro numbers.
  const uniqueTicketKeys = new Set<string>();

  // Set a limit for attempts to generate a unique ticket combination.
  // This prevents potential infinite loops if uniqueness is unexpectedly hard to achieve
  // (e.g., requesting many tickets from a very small number pool, although unlikely for EuroJackpot).
  const MAX_RETRIES_PER_TICKET = 20; // Increased slightly for larger system tickets

  for (let i = 0; i < ticketCount; i++) {
    let mainNumbers: number[];
    let euroNumbers: number[];
    let ticketKey: string;
    let attempts = 0;

    // Loop to ensure the generated ticket combination is unique within this batch.
    do {
      attempts++;
      if (attempts > MAX_RETRIES_PER_TICKET) {
        // If uniqueness cannot be achieved after several tries, something might be wrong.
        throw new Error(`Max retries (${MAX_RETRIES_PER_TICKET}) exceeded while generating unique ticket ${i + 1}/${ticketCount}. Possible issues: requesting too many tickets for the chosen system, or error in number generation logic.`);
      }

      // Generate main numbers. Uses weighted stats if available, otherwise random.
      // generateNumbers already sorts the output array.
      mainNumbers = generateNumbers(
        mainCount,
        MAIN_NUMBER_MIN,
        MAIN_NUMBER_MAX,
        statsData?.numbers // Pass main number stats (if available)
      );

      // Generate euro numbers. Uses weighted stats if available, otherwise random.
      // generateNumbers already sorts the output array.
      euroNumbers = generateNumbers(
        euroCount,
        EURO_NUMBER_MIN,
        EURO_NUMBER_MAX,
        statsData?.additionalNumbers // Pass euro number stats (if available)
      );

      // Create a unique string representation for the combination.
      // Sorting is crucial here to ensure "1,5" and "5,1" produce the same key.
      // generateNumbers already sorts, but sorting again ensures consistency if the source changes.
      ticketKey = mainNumbers.sort((a, b) => a - b).join(',') + '|' + euroNumbers.sort((a, b) => a - b).join(',');

    } while (uniqueTicketKeys.has(ticketKey)); // Repeat if this combination already exists in the current batch

    // Add the unique key to the set.
    uniqueTicketKeys.add(ticketKey);

    // Create the ticket object.
    generatedTickets.push({
      id: ticketIdCounter++, // Assign and increment the session-unique ID
      mainNumbers,           // Numbers are already sorted by generateNumbers
      euroNumbers            // Numbers are already sorted by generateNumbers
      // winClass, winningMainNumbers, winningEuroNumbers are added later during simulation check.
    });
  }

  // Return the array of generated unique tickets.
  return generatedTickets;
}