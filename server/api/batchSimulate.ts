import {
  defineEventHandler,
  readBody,
  getHeader,
  setHeader,
  sendStream,
  createError,
} from 'h3'
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
  BatchSimulationResult,
  IndividualSimulationResult,
  TicketHighlightingData,
} from '~/types/batchSimulation'
import type { EurojackpotHistoricOdds } from '~/types/winning'
import {
  batchSimulationRequestSchema,
  eurojackpotHistoricOddsSchema,
  type BatchSimulationRequest,
} from '~/schemas'
import { validateInput, handleEndpointError } from '../utils/validation'
import { normalizeOdds } from '~/utils/odds'
import {
  calculateBatchStatistics,
  simulateSingleDraw,
} from '~/utils/batchStatistics'
import {
  combinationCount,
  calculateWinningLineCounts,
} from '~/utils/combinatorics'
import type { Ticket } from '~/types/ticket'
import { buildOddsMap } from '~/utils/payout'
import { PRICE_PER_LINE } from '~/utils/pricing'

/**
 * API endpoint to run batch simulations of EuroJackpot draws.
 * Performs multiple simulated draws with provided tickets and returns comprehensive statistics.
 *
 * @param event The H3 event object containing the request body with simulation parameters
 * @returns Promise resolving to BatchSimulationResult with comprehensive statistics
 */
export default defineEventHandler(
  async (event): Promise<BatchSimulationResult | undefined> => {
    try {
      // 1. Validate Accept header for NDJSON
      const accept = (getHeader(event, 'accept') || '').toLowerCase()
      const wantsNdjson = accept.includes('application/x-ndjson')
      // Accept common JSON accepts, NDJSON, or */* (very common from fetch/clients)
      const acceptsAnything = accept.includes('*/*')
      if (
        accept &&
        !acceptsAnything &&
        !accept.includes('application/json') &&
        !wantsNdjson
      ) {
        throw createError({
          statusCode: 406,
          statusMessage: 'Not Acceptable',
          data: {
            message:
              'Unsupported Accept header. Expected application/json or application/x-ndjson.',
          },
        })
      }

      // 2. Validate input at the edge
      const rawBody = await readBody(event)
      const body = validateInput(
        batchSimulationRequestSchema,
        rawBody,
        'batch simulation request'
      )

      const {
        tickets,
        simulationCount,
        includeIndividualResults = false,
        batchSize = 100,
      } = body

      // Fetch current winning odds data for payout calculations
      const winningData = await fetchWinningData()
      const oddsMap = buildOddsMap(winningData)
      // Calculate cost per simulation (assuming all tickets have same system price)
      const costPerSimulation = calculateTotalCost(tickets)
      const totalCost = costPerSimulation * simulationCount

      console.log(
        `Starting batch simulation: ${simulationCount} simulations with ${tickets.length} tickets`
      )

      // NDJSON detection already done above during validation

      // Run batch simulation in chunks to manage memory
      const individualResults: IndividualSimulationResult[] = []
      const chunks = Math.ceil(simulationCount / batchSize)

      // Initialize lightweight highlighting data collection
      const highlightingData: TicketHighlightingData = {
        ticketStats: {},
      }
      tickets.forEach((ticket) => {
        highlightingData.ticketStats[ticket.id] = {
          mainNumberFrequency: {},
          euroNumberFrequency: {},
          winClassCounts: {},
          totalWins: 0,
        }
      })

      // If client requests NDJSON, stream incremental progress after each chunk
      if (wantsNdjson) {
        const stream = new TransformStream<Uint8Array, Uint8Array>()
        const writer = stream.writable.getWriter()
        const encoder = new TextEncoder()

        setHeader(event, 'content-type', 'application/x-ndjson; charset=utf-8')
        setHeader(event, 'cache-control', 'no-cache')

        const writeLine = async (obj: unknown) => {
          await writer.write(encoder.encode(JSON.stringify(obj) + '\n'))
        }

        ;(async () => {
          try {
            for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
              const startIndex = chunkIndex * batchSize
              const endIndex = Math.min(startIndex + batchSize, simulationCount)
              const chunkSize = endIndex - startIndex

              const chunkResults = await processSimulationChunk(
                tickets,
                chunkSize,
                startIndex,
                oddsMap,
                costPerSimulation,
                highlightingData
              )

              individualResults.push(...chunkResults)

              // Calculate partial statistics so far
              const partialTotalCost = costPerSimulation * endIndex
              const partialStats = calculateBatchStatistics(
                individualResults,
                partialTotalCost
              )
              if (!includeIndividualResults) {
                partialStats.individualResults = undefined
              }

              // Emit progress update
              await writeLine({
                type: 'progress',
                progress: {
                  currentSimulation: endIndex,
                  totalSimulations: simulationCount,
                  progressPercentage: (endIndex / simulationCount) * 100,
                },
                summary: {
                  totalCost: partialStats.totalCost,
                  totalWinnings: partialStats.totalWinnings,
                  netProfit: partialStats.netProfit,
                  roiPercentage: partialStats.roiPercentage,
                  maxWin: partialStats.statistics.maxWinnings,
                  winDistribution: partialStats.winDistribution,
                },
              })

              // Yield control to prevent blocking
              if (chunkIndex < chunks - 1) {
                await new Promise((resolve) => setTimeout(resolve, 1))
              }
            }

            // Final comprehensive statistics
            const finalResult = calculateBatchStatistics(
              individualResults,
              totalCost
            )
            if (!includeIndividualResults) {
              finalResult.individualResults = undefined
            }

            // Always include lightweight highlighting data
            finalResult.highlightingData = highlightingData

            await writeLine({ type: 'result', result: finalResult })
          } catch (e: unknown) {
            await writeLine({
              type: 'error',
              error: e instanceof Error ? e.message : String(e),
            })
          } finally {
            await writer.close()
          }
        })()

        await sendStream(event, stream.readable)
        return undefined
      }

      // Non-streaming fallback: process synchronously and return JSON at the end
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
          oddsMap,
          costPerSimulation,
          highlightingData
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

      // Always include lightweight highlighting data
      batchResult.highlightingData = highlightingData

      return batchResult
    } catch (error: unknown) {
      handleEndpointError(error, '/api/batchSimulate')
    }
  }
)

/**
 * Validates the batch simulation request parameters.
 */
// Validation now handled by Zod schemas

/**
 * Processes a chunk of simulations to manage memory usage.
 */
async function processSimulationChunk(
  tickets: BatchSimulationRequest['tickets'],
  chunkSize: number,
  startIndex: number,
  oddsMap: Map<number, number>,
  costPerSimulation: number,
  highlightingData: TicketHighlightingData
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
      oddsMap,
      costPerSimulation, // Total cost for this simulation (all lines for all tickets)
      simulationIndex
    )

    // Collect lightweight highlighting data
    collectHighlightingDataFromResult(
      tickets,
      winningMainNumbers,
      winningEuroNumbers,
      result,
      highlightingData
    )

    results.push(result)
  }

  return results
}

/**
 * Collects lightweight highlighting data from a simulation result.
 * Much more memory-efficient than storing full individual results.
 */
function collectHighlightingDataFromResult(
  tickets: BatchSimulationRequest['tickets'],
  winningMainNumbers: number[],
  winningEuroNumbers: number[],
  _result: IndividualSimulationResult,
  highlightingData: TicketHighlightingData
): void {
  const mainSet = new Set(winningMainNumbers)
  const euroSet = new Set(winningEuroNumbers)

  tickets.forEach((ticket) => {
    const ticketStats = highlightingData.ticketStats[ticket.id]

    // Calculate wins for THIS specific ticket in THIS simulation
    const matchingMain = ticket.mainNumbers.filter((n) => mainSet.has(n))
    const matchingEuro = ticket.euroNumbers.filter((n) => euroSet.has(n))

    const k = matchingMain.length
    const h = matchingEuro.length
    const m = ticket.mainNumbers.length
    const e = ticket.euroNumbers.length

    const ticketWinCounts = calculateWinningLineCounts(m, e, k, h)
    const hasWin = Object.values(ticketWinCounts).some((count) => count > 0)

    if (hasWin) {
      ticketStats.totalWins++

      // Track winning number frequencies for this ticket
      matchingMain.forEach((num) => {
        ticketStats.mainNumberFrequency[num] =
          (ticketStats.mainNumberFrequency[num] || 0) + 1
      })

      matchingEuro.forEach((num) => {
        ticketStats.euroNumberFrequency[num] =
          (ticketStats.euroNumberFrequency[num] || 0) + 1
      })
    }

    // Accumulate win class counts for THIS specific ticket
    Object.entries(ticketWinCounts).forEach(([cls, count]) => {
      const classNum = Number(cls)
      if (count > 0) {
        ticketStats.winClassCounts[classNum] =
          (ticketStats.winClassCounts[classNum] || 0) + count
      }
    })
  })
}

/**
 * Fetches current winning odds data (reusing logic from existing endpoint).
 */
async function fetchWinningData(): Promise<EurojackpotHistoricOdds> {
  try {
    // Use the same working URL pattern as single draw
    const { generateEurojackpotUrl, EurojackpotDrawType } = await import(
      '~/utils/dateUtils'
    )
    const url = generateEurojackpotUrl(EurojackpotDrawType.PREVIOUS)

    console.log(`Batch simulation fetching winning data from: ${url}`)

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      console.warn(
        'Failed to fetch current odds, using normalized fallback data'
      )
      return normalizeOdds(getFallbackWinningData())
    }

    const rawData = await response.json()
    const parseResult = eurojackpotHistoricOddsSchema.safeParse(rawData)

    if (!parseResult.success) {
      console.warn(
        'Invalid odds data structure from external API, using normalized fallback:',
        parseResult.error.issues
      )
      return normalizeOdds(getFallbackWinningData())
    }

    console.log(
      'Batch simulation winning data fetched and validated successfully'
    )
    // Always normalize validated data to ensure consistent class numbering etc.
    return normalizeOdds(parseResult.data)
  } catch (error) {
    console.warn(
      'Error fetching winning data, using normalized fallback:',
      error
    )
    return normalizeOdds(getFallbackWinningData())
  }
}

/**
 * Provides fallback winning odds data when live data is unavailable.
 */
function getFallbackWinningData(): EurojackpotHistoricOdds {
  const now = new Date()
  const ts = now.getTime()
  return {
    eurojackpotGameCycle: {
      cycleNo: 0,
      cycleYear: now.getFullYear(),
      eventDate: ts,
      eventWeekday: now.getDay(),
      gametableValidFrom: null,
      gametableValidTo: null,
      key: 'fallback-batch-sim',
      variantNo: 0,
    },
    eurojackpotOdds: [
      {
        amount: 90000000.0,
        numberOfWins: 0,
        winningClass: 1,
        sequence: 1,
        jackpot: true,
      },
      {
        amount: 1200000.0,
        numberOfWins: 0,
        winningClass: 2,
        sequence: 2,
        jackpot: false,
      },
      {
        amount: 180000.0,
        numberOfWins: 0,
        winningClass: 3,
        sequence: 3,
        jackpot: false,
      },
      {
        amount: 6000.0,
        numberOfWins: 0,
        winningClass: 4,
        sequence: 4,
        jackpot: false,
      },
      {
        amount: 300.0,
        numberOfWins: 0,
        winningClass: 5,
        sequence: 5,
        jackpot: false,
      },
      {
        amount: 150.0,
        numberOfWins: 0,
        winningClass: 6,
        sequence: 6,
        jackpot: false,
      },
      {
        amount: 100.0,
        numberOfWins: 0,
        winningClass: 7,
        sequence: 7,
        jackpot: false,
      },
      {
        amount: 50.0,
        numberOfWins: 0,
        winningClass: 8,
        sequence: 8,
        jackpot: false,
      },
      {
        amount: 25.0,
        numberOfWins: 0,
        winningClass: 9,
        sequence: 9,
        jackpot: false,
      },
      {
        amount: 15.0,
        numberOfWins: 0,
        winningClass: 10,
        sequence: 10,
        jackpot: false,
      },
      {
        amount: 10.0,
        numberOfWins: 0,
        winningClass: 11,
        sequence: 11,
        jackpot: false,
      },
      {
        amount: 8.0,
        numberOfWins: 0,
        winningClass: 12,
        sequence: 12,
        jackpot: false,
      },
    ],
    eurojackpotTurnover: [{ amount: 0, jurisdiction: 0 }],
  }
}

/**
 * Calculates the total cost for a set of tickets.
 * For now, uses a simplified approach assuming standard system pricing.
 */
function calculateTotalCost(tickets: Ticket[]): number {
  return tickets.reduce((sum, t) => {
    const m = t.mainNumbers.length
    const e = t.euroNumbers.length
    return sum + combinationCount(m, e) * PRICE_PER_LINE
  }, 0)
}
