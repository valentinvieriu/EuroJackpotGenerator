import { defineEventHandler } from 'h3'
import type { FetchWinningDataResponse } from '~/schemas'
import { handleEndpointError } from '../utils/validation'
import { fetchWinningData } from '../utils/winningData'

/**
 * API endpoint handler to fetch the latest available EuroJackpot winning numbers and odds data.
 * Validates input/output at the edges and handles all error cases properly.
 */
export default defineEventHandler(
  async (): Promise<FetchWinningDataResponse> => {
    try {
      // Use centralized function with output validation for this standalone endpoint
      return await fetchWinningData({ validateOutput: true })
    } catch (error: unknown) {
      handleEndpointError(error, '/api/fetchWinningData')
    }
  }
)
