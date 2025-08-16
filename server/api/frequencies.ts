import { defineEventHandler } from 'h3'
import type { FetchFrequenciesResponse } from '~/schemas'
import { fetchFrequenciesResponseSchema } from '~/schemas'
import { handleEndpointError, validateOutput } from '../utils/validation'
import { fetchStatistics } from '../utils/statistics'
import { logger } from '~/utils/logger'

/**
 * API endpoint handler to fetch EuroJackpot historical frequency statistics.
 * Reuses the existing fetchStatistics utility with its built-in caching and error handling.
 * Validates output at the edges and handles all error cases properly.
 */
export default defineEventHandler(
  async (): Promise<FetchFrequenciesResponse> => {
    try {
      logger.debug('Fetching frequency statistics...')

      // Use existing statistics fetching utility with built-in caching
      const statisticsData = await fetchStatistics()

      if (!statisticsData) {
        // Return null when statistics are unavailable (handled by fetchStatistics)
        logger.warn('Statistics data unavailable for frequency endpoint')
        return null
      }

      logger.info('Successfully fetched frequency statistics')

      // Validate output at the edge (fetchStatistics already validates, but double-check)
      return validateOutput(
        fetchFrequenciesResponseSchema,
        statisticsData,
        'frequency statistics response'
      )
    } catch (error: unknown) {
      handleEndpointError(error, '/api/frequencies')
    }
  }
)
