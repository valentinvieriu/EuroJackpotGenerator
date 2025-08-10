import { generateRandomNumbers } from '~/utils/numberGenerator'
import { defineEventHandler, readBody } from 'h3'
import {
  MAIN_NUMBER_MIN,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MIN,
  EURO_NUMBER_MAX,
  MAIN_NUMBERS_COUNT,
  EURO_NUMBERS_COUNT,
} from '~/utils/constants'
import {
  simulateRequestSchema,
  simulateResponseSchema,
  type SimulateResponse,
} from '~/schemas'
import {
  validateInput,
  validateOutput,
  handleEndpointError,
} from '../utils/validation'
import { generateSeededRandomNumbers } from '../utils/seededRng'

/**
 * API endpoint handler to simulate a standard EuroJackpot draw.
 * Accepts optional seed parameter for reproducible draws.
 * Returns structured response with draw data and metadata.
 */
export default defineEventHandler(async (event): Promise<SimulateResponse> => {
  try {
    // 1. Validate input (optional seed parameter)
    // Prefer actual readBody, but allow a test-friendly fallback when a plain object body is provided
    let rawBody: unknown = {}
    try {
      const reqUnknown = event?.node?.req as unknown
      let maybeBody: unknown | undefined
      if (
        reqUnknown &&
        typeof reqUnknown === 'object' &&
        'body' in reqUnknown
      ) {
        maybeBody = (reqUnknown as { body?: unknown }).body
      }

      if (maybeBody !== undefined) {
        rawBody =
          typeof maybeBody === 'string' ? JSON.parse(maybeBody) : maybeBody
      } else {
        rawBody = await readBody(event)
      }
    } catch {
      rawBody = {}
    }
    const input = validateInput(
      simulateRequestSchema,
      rawBody,
      'simulation request'
    )

    const { seed } = input
    const generatedAt = new Date().toISOString()

    // 2. Generate numbers based on whether seed is provided
    let mainNumbers: number[]
    let euroNumbers: number[]
    let algorithm: 'uniform' | 'weighted'

    if (seed) {
      // Use seeded generation for reproducible results
      algorithm = 'uniform' // Seeded generation uses uniform distribution
      mainNumbers = generateSeededRandomNumbers(
        MAIN_NUMBERS_COUNT,
        MAIN_NUMBER_MIN,
        MAIN_NUMBER_MAX,
        seed + '_main' // Add suffix to differentiate main vs euro seed
      )
      euroNumbers = generateSeededRandomNumbers(
        EURO_NUMBERS_COUNT,
        EURO_NUMBER_MIN,
        EURO_NUMBER_MAX,
        seed + '_euro'
      )
    } else {
      // Use cryptographically secure random generation
      algorithm = 'uniform'
      mainNumbers = generateRandomNumbers(
        MAIN_NUMBERS_COUNT,
        MAIN_NUMBER_MIN,
        MAIN_NUMBER_MAX
      )
      euroNumbers = generateRandomNumbers(
        EURO_NUMBERS_COUNT,
        EURO_NUMBER_MIN,
        EURO_NUMBER_MAX
      )
    }

    // 3. Construct response with structured format
    const result = {
      draw: {
        mainNumbers,
        euroNumbers,
      },
      meta: {
        algorithm,
        seed,
        generatedAt,
      },
    }

    // 4. Validate output at the edge
    return validateOutput(simulateResponseSchema, result, 'simulation response')
  } catch (error: unknown) {
    handleEndpointError(error, '/api/simulate')
  }
})
