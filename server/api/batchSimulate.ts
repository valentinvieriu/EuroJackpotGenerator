import { H3Error, createError, defineEventHandler, readBody } from 'h3'
import { generateRandomNumbers } from '~/utils/numberGenerator'
import {
  MAIN_NUMBER_MIN,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MIN,
  EURO_NUMBER_MAX,
  MAIN_NUMBERS_COUNT,
  EURO_NUMBERS_COUNT,
} from '~/utils/constants'
import type {
  BatchSimulationRequest,
  BatchSimulationResult,
  IndividualSimulationResult,
} from '~/types/batchSimulation'
import type { EurojackpotHistoricOdds } from '~/types/winning'
import {
  calculateBatchStatistics,
  simulateSingleDraw,
} from '~/utils/batchStatistics'

/**
 * API endpoint to run batch simulations of EuroJackpot draws.
 * Performs multiple simulated draws with provided tickets and returns comprehensive statistics.
 *
 * @param event The H3 event object containing the request body with simulation parameters
 * @returns Promise resolving to BatchSimulationResult with comprehensive statistics
 */
export default defineEventHandler(
  async (event): Promise<BatchSimulationResult> => {
    try {
      // Parse and validate request body
      const body = await readBody<BatchSimulationRequest>(event)

      // Validate input parameters
      validateBatchSimulationRequest(body)

      const {
        tickets,
        simulationCount,
        includeIndividualResults = false,
        batchSize = 100,
      } = body

      // Fetch current winning odds data for payout calculations
      const winningData = await fetchWinningData()

      // Calculate cost per simulation (assuming all tickets have same system price)
      const costPerSimulation = calculateTotalCost(tickets)
      const totalCost = costPerSimulation * simulationCount

      console.log(
        `Starting batch simulation: ${simulationCount} simulations with ${tickets.length} tickets`
      )

      // Run batch simulation in chunks to manage memory
      const individualResults: IndividualSimulationResult[] = []
      const chunks = Math.ceil(simulationCount / batchSize)

      for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
        const startIndex = chunkIndex * batchSize
        const endIndex = Math.min(startIndex + batchSize, simulationCount)
        const chunkSize = endIndex - startIndex

        console.log(
          `Processing chunk ${chunkIndex + 1}/${chunks}: simulations ${startIndex + 1}-${endIndex}`
        )

        // Process this chunk of simulations
        const chunkResults = await processSimulationChunk(
          tickets,
          chunkSize,
          startIndex,
          winningData,
          costPerSimulation
        )

        individualResults.push(...chunkResults)

        // Yield control to prevent blocking (important for Cloudflare Workers)
        if (chunkIndex < chunks - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1))
        }
      }

      console.log(
        `Batch simulation completed: ${individualResults.length} simulations processed`
      )

      // Calculate comprehensive statistics
      const batchResult = calculateBatchStatistics(individualResults, totalCost)

      // Conditionally include individual results based on request
      if (!includeIndividualResults) {
        batchResult.individualResults = undefined
      }

      return batchResult
    } catch (error: unknown) {
      console.error('Error in batch simulation endpoint:', error)

      if (error instanceof H3Error) {
        throw error
      }

      throw createError({
        statusCode: 500,
        statusMessage:
          'An internal server error occurred during batch simulation.',
        data: {
          message: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }
)

/**
 * Validates the batch simulation request parameters.
 */
function validateBatchSimulationRequest(
  body: unknown
): asserts body is BatchSimulationRequest {
  if (!body || typeof body !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body. Expected JSON object.',
    })
  }

  if (!Array.isArray(body.tickets) || body.tickets.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid tickets array. Must be non-empty array.',
    })
  }

  if (!Number.isInteger(body.simulationCount) || body.simulationCount < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid simulation count. Must be positive integer.',
    })
  }

  if (body.simulationCount > 10000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Simulation count too large. Maximum allowed is 10,000.',
    })
  }

  if (
    body.batchSize &&
    (!Number.isInteger(body.batchSize) ||
      body.batchSize < 1 ||
      body.batchSize > 1000)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid batch size. Must be integer between 1 and 1000.',
    })
  }

  // Validate ticket structure
  for (const ticket of body.tickets) {
    if (
      !ticket.mainNumbers ||
      !Array.isArray(ticket.mainNumbers) ||
      ticket.mainNumbers.length < 5
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid ticket: mainNumbers must be array with at least 5 numbers.',
      })
    }

    if (
      !ticket.euroNumbers ||
      !Array.isArray(ticket.euroNumbers) ||
      ticket.euroNumbers.length < 2
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid ticket: euroNumbers must be array with at least 2 numbers.',
      })
    }
  }
}

/**
 * Processes a chunk of simulations to manage memory usage.
 */
async function processSimulationChunk(
  tickets: BatchSimulationRequest['tickets'],
  chunkSize: number,
  startIndex: number,
  winningData: EurojackpotHistoricOdds,
  costPerSimulation: number
): Promise<IndividualSimulationResult[]> {
  const results: IndividualSimulationResult[] = []

  for (let i = 0; i < chunkSize; i++) {
    const simulationIndex = startIndex + i

    // Generate random winning numbers for this simulation
    const winningMainNumbers = generateRandomNumbers(
      MAIN_NUMBERS_COUNT,
      MAIN_NUMBER_MIN,
      MAIN_NUMBER_MAX
    )

    const winningEuroNumbers = generateRandomNumbers(
      EURO_NUMBERS_COUNT,
      EURO_NUMBER_MIN,
      EURO_NUMBER_MAX
    )

    // Simulate this draw
    const result = simulateSingleDraw(
      tickets,
      winningMainNumbers,
      winningEuroNumbers,
      winningData,
      costPerSimulation / tickets.length, // Cost per individual ticket
      simulationIndex
    )

    results.push(result)
  }

  return results
}

/**
 * Fetches current winning odds data (reusing logic from existing endpoint).
 */
async function fetchWinningData(): Promise<EurojackpotHistoricOdds> {
  try {
    const response = await fetch(
      'https://www.lotto-bayern.de/getEuroJackpotCurrentOdds'
    )

    if (!response.ok) {
      console.warn('Failed to fetch current odds, using fallback data')
      return getFallbackWinningData()
    }

    const data = await response.json()

    if (!data?.eurojackpotOdds || !Array.isArray(data.eurojackpotOdds)) {
      console.warn('Invalid odds data structure, using fallback')
      return getFallbackWinningData()
    }

    return data as EurojackpotHistoricOdds
  } catch (error) {
    console.warn('Error fetching winning data, using fallback:', error)
    return getFallbackWinningData()
  }
}

/**
 * Provides fallback winning odds data when live data is unavailable.
 */
function getFallbackWinningData(): EurojackpotHistoricOdds {
  return {
    eurojackpotOdds: [
      { winningClass: 1, amount: 90000000.0 }, // Jackpot
      { winningClass: 2, amount: 1200000.0 }, // 5+1
      { winningClass: 3, amount: 180000.0 }, // 5+0
      { winningClass: 4, amount: 6000.0 }, // 4+2
      { winningClass: 5, amount: 300.0 }, // 4+1
      { winningClass: 6, amount: 150.0 }, // 3+2
      { winningClass: 7, amount: 100.0 }, // 4+0
      { winningClass: 8, amount: 50.0 }, // 2+2
      { winningClass: 9, amount: 25.0 }, // 3+1
      { winningClass: 10, amount: 15.0 }, // 3+0
      { winningClass: 11, amount: 10.0 }, // 1+2
      { winningClass: 12, amount: 8.0 }, // 2+1
    ],
  }
}

/**
 * Calculates the total cost for a set of tickets.
 * For now, uses a simplified approach assuming standard system pricing.
 */
function calculateTotalCost(
  tickets: BatchSimulationRequest['tickets']
): number {
  // This is a simplified cost calculation
  // In a real implementation, you might want to pass the actual cost from the frontend
  // or calculate based on ticket system type
  return tickets.length * 2.0 // Assuming €2 per basic ticket
}
