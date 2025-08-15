import { combinationCount } from '~/utils/combinatorics'
import type { H3Event } from 'h3'
import { readBody, defineEventHandler } from 'h3'
import type { Ticket, StatisticsData, GenerateResponse } from '~/schemas'
import { generateRequestSchema, generateResponseSchema } from '~/schemas'
import {
  validateInput,
  validateOutput,
  handleEndpointError,
} from '../utils/validation'
import { fetchStatistics } from '../utils/statistics'
import { generateNumbers } from '~/utils/numberGenerator'
import {
  MAIN_NUMBER_MIN,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MIN,
  EURO_NUMBER_MAX,
} from '~/utils/constants'
import { generateSeededRandomNumbers } from '../utils/seededRng'
import { logger } from '~/utils/logger'

type Algorithm = 'uniform' | 'weighted'

/**
 * Generates a specified number of unique EuroJackpot tickets.
 * Numbers can be generated based on historical statistics (if available and fetched successfully) or purely randomly.
 * Ensures that no two tickets generated in the *same batch* have the identical combination of main and euro numbers.
 */
async function generateTickets(
  ticketCount: number,
  mainCount: number,
  euroCount: number,
  algorithm: Algorithm = 'weighted',
  seed?: string
): Promise<Ticket[]> {
  // Decide whether to fetch stats (only if not using seeded generation)
  let statsData: StatisticsData | null = null
  if (algorithm === 'weighted' && !seed) {
    try {
      statsData = await fetchStatistics()
      if (!statsData) {
        logger.warn(
          'Statistics unavailable; falling back to uniform generation.'
        )
      }
    } catch (error) {
      logger.error(
        'Failed to fetch statistics, using uniform generation:',
        error instanceof Error ? error.message : String(error)
      )
    }
  } // algorithm === 'uniform' or seed provided -> leave statsData as null to force uniform

  // Note: Input validation is handled by Zod schema at the API route level
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

/**
 * API endpoint handler for generating EuroJackpot tickets.
 * Validates input/output at the edges and handles all error cases properly.
 */
export default defineEventHandler(
  async (event: H3Event): Promise<GenerateResponse> => {
    try {
      // 1. Validate input at the edge
      const rawBody = await readBody(event)
      const { ticketCount, mainCount, euroCount, algorithm, seed } =
        validateInput(
          generateRequestSchema,
          rawBody,
          'ticket generation request'
        )

      // 2. Execute business logic
      logger.debug(
        `Generating ${ticketCount} tickets with system ${mainCount}/${euroCount}...`
      )
      const tickets = await generateTickets(
        ticketCount,
        mainCount,
        euroCount,
        algorithm,
        seed
      )

      // 3. Set linesCount for each ticket
      for (const ticket of tickets) {
        ticket.linesCount = combinationCount(
          ticket.mainNumbers.length,
          ticket.euroNumbers.length
        )
      }

      logger.info(`Successfully generated ${tickets.length} tickets.`)

      // 4. Validate output at the edge
      return validateOutput(
        generateResponseSchema,
        tickets,
        'ticket generation response'
      )
    } catch (error: unknown) {
      handleEndpointError(error, '/api/generate')
    }
  }
)
