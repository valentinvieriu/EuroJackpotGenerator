import { fetchStatistics } from './statistics'
import { generateNumbers } from '~/utils/numberGenerator'
import type { Ticket, StatisticsData } from '~/schemas'
import {
  MAIN_NUMBER_MIN,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MIN,
  EURO_NUMBER_MAX,
} from '~/utils/constants'
import { generateSeededRandomNumbers } from './seededRng'

// IDs are assigned per-batch deterministically (1..N) to avoid cross-request leakage.

type Algorithm = 'uniform' | 'weighted'

interface Options {
  algorithm?: Algorithm
  seed?: string
}

/**
 * SERVER-ONLY: Generates a specified number of unique EuroJackpot tickets.
 * Numbers can be generated based on historical statistics (if available and fetched successfully) or purely randomly.
 * Ensures that no two tickets generated in the *same batch* have the identical combination of main and euro numbers.
 *
 * This function uses server-only statistics fetching and MUST NOT be imported by client code.
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
  euroCount: number,
  options: Options = {}
): Promise<Ticket[]> {
  const algorithm: Algorithm = options.algorithm ?? 'weighted'
  const { seed } = options

  // Decide whether to fetch stats (only if not using seeded generation)
  let statsData: StatisticsData | null = null
  if (algorithm === 'weighted' && !seed) {
    try {
      statsData = await fetchStatistics()
      if (!statsData) {
        console.warn(
          'Statistics unavailable; falling back to uniform generation.'
        )
      }
    } catch (error) {
      console.error(
        'Failed to fetch statistics, using uniform generation:',
        error instanceof Error ? error.message : String(error)
      )
    }
  } // algorithm === 'uniform' or seed provided -> leave statsData as null to force uniform

  // Note: Input validation is primarily handled by Zod schema at the API route level.
  // These are minimal internal assertions for direct function calls (e.g., tests).
  if (!Number.isInteger(ticketCount) || ticketCount <= 0) {
    throw new Error('ticketCount must be a positive integer.')
  }
  if (!Number.isInteger(mainCount) || mainCount < 5 || mainCount > 16) {
    throw new Error('mainCount must be an integer between 5 and 16.')
  }
  if (!Number.isInteger(euroCount) || euroCount < 2 || euroCount > 12) {
    throw new Error('euroCount must be an integer between 2 and 12.')
  }

  const generatedTickets: Ticket[] = []
  const uniqueTicketKeys = new Set<string>()
  const MAX_RETRIES_PER_TICKET = 20

  for (let i = 0; i < ticketCount; i++) {
    let mainNumbers: number[]
    let euroNumbers: number[]
    let ticketKey: string
    let attempts = 0

    do {
      attempts++
      if (attempts > MAX_RETRIES_PER_TICKET) {
        throw new Error(
          `Max retries (${MAX_RETRIES_PER_TICKET}) exceeded while generating unique ticket ${i + 1}/${ticketCount}. Possible issues: requesting too many tickets for the chosen system, or error in number generation logic.`
        )
      }

      if (seed) {
        // Use seeded generation for reproducible results (uniform selection)
        mainNumbers = generateSeededRandomNumbers(
          mainCount,
          MAIN_NUMBER_MIN,
          MAIN_NUMBER_MAX,
          `${seed}_main_${i}`
        )
        euroNumbers = generateSeededRandomNumbers(
          euroCount,
          EURO_NUMBER_MIN,
          EURO_NUMBER_MAX,
          `${seed}_euro_${i}`
        )
      } else {
        // Use weighted stats when available; generateNumbers falls back to uniform when statsData is null
        mainNumbers = generateNumbers(
          mainCount,
          MAIN_NUMBER_MIN,
          MAIN_NUMBER_MAX,
          statsData?.numbers
        )
        euroNumbers = generateNumbers(
          euroCount,
          EURO_NUMBER_MIN,
          EURO_NUMBER_MAX,
          statsData?.additionalNumbers
        )
      }

      ticketKey =
        mainNumbers
          .slice()
          .sort((a, b) => a - b)
          .join(',') +
        '|' +
        euroNumbers
          .slice()
          .sort((a, b) => a - b)
          .join(',')
    } while (uniqueTicketKeys.has(ticketKey))

    uniqueTicketKeys.add(ticketKey)

    generatedTickets.push({
      id: i + 1,
      mainNumbers,
      euroNumbers,
    })
  }

  return generatedTickets
}
