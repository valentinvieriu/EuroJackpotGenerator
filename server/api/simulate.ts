import { generateRandomNumbers } from '~/utils/numberGenerator'
import { defineEventHandler } from 'h3'
import {
  MAIN_NUMBER_MIN,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MIN,
  EURO_NUMBER_MAX,
  MAIN_NUMBERS_COUNT,
  EURO_NUMBERS_COUNT,
} from '~/utils/constants'
import { simulateResponseSchema, type SimulateResponse } from '~/schemas'
import { validateOutput, handleEndpointError } from '../utils/validation'

/**
 * API endpoint handler to simulate a standard EuroJackpot draw.
 * Validates output at the edge and handles all error cases properly.
 */
export default defineEventHandler(async (): Promise<SimulateResponse> => {
  try {
    // 1. Execute business logic - generate random winning numbers
    const mainNumbers = generateRandomNumbers(
      MAIN_NUMBERS_COUNT,
      MAIN_NUMBER_MIN,
      MAIN_NUMBER_MAX
    )

    const euroNumbers = generateRandomNumbers(
      EURO_NUMBERS_COUNT,
      EURO_NUMBER_MIN,
      EURO_NUMBER_MAX
    )

    const result = {
      mainNumbers,
      euroNumbers,
    }

    // 2. Validate output at the edge
    return validateOutput(simulateResponseSchema, result, 'simulation response')
  } catch (error: unknown) {
    handleEndpointError(error, '/api/simulate')
  }
})
