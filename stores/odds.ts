/**
 * Odds Store - Manages cached payout data from external API
 * Reduces redundant API calls and provides fallback handling
 */

import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { EurojackpotHistoricOdds } from '~/schemas'
import { buildOddsMap } from '~/utils/payout'
import { FALLBACK_EUROJACKPOT_ODDS } from '~/utils/fallbackOdds'
import { logger } from '~/utils/logger'
import { extractErrorMessage } from '~/utils/errors'

interface OddsCache {
  data: EurojackpotHistoricOdds | null
  timestamp: number
  isLoading: boolean
  error: string | null
}

// Cache duration in milliseconds (10 minutes to match server cache)
const CACHE_DURATION = 10 * 60 * 1000

/**
 * Odds store for managing cached payout data
 * Provides efficient caching and fallback handling for external API calls
 */
export const useOddsStore = defineStore('odds', () => {
  // State
  const cache = ref<OddsCache>({
    data: null,
    timestamp: 0,
    isLoading: false,
    error: null,
  })

  // Computed getters
  const isExpired = computed(() => {
    if (!cache.value.timestamp) return true
    return Date.now() - cache.value.timestamp > CACHE_DURATION
  })

  const hasValidCache = computed(() => {
    return !isExpired.value && cache.value.data !== null
  })

  const currentOdds = computed(() => {
    // Server returns schema-validated or normalized data.
    // Use canonical fallback directly when cache is empty.
    return cache.value.data || FALLBACK_EUROJACKPOT_ODDS
  })

  const isLoading = computed(() => cache.value.isLoading)
  const hasError = computed(() => !!cache.value.error)

  // Actions
  const fetchOdds = async (
    forceRefresh = false
  ): Promise<EurojackpotHistoricOdds> => {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && hasValidCache.value) {
      return cache.value.data!
    }

    // Don't start multiple requests
    if (cache.value.isLoading) {
      // Wait for current request to complete
      await waitForLoading()
      return currentOdds.value
    }

    cache.value.isLoading = true
    cache.value.error = null

    try {
      const runtimeConfig = useRuntimeConfig()
      const apiBaseUrl = runtimeConfig.public.apiBase

      const response = await $fetch<EurojackpotHistoricOdds>(
        `${apiBaseUrl}/fetchWinningData`,
        {
          method: 'GET',
        }
      )

      // Update cache with fresh data
      cache.value = {
        data: response,
        timestamp: Date.now(),
        isLoading: false,
        error: null,
      }

      return response
    } catch (error: unknown) {
      const errorMessage = extractErrorMessage(error)

      cache.value.isLoading = false
      cache.value.error = errorMessage

      logger.warn('Failed to fetch odds data, using fallback:', errorMessage)

      // Return fallback odds on error; fallback is already schema-validated
      if (!cache.value.data) {
        cache.value.data = FALLBACK_EUROJACKPOT_ODDS
        cache.value.timestamp = Date.now()
      }

      return cache.value.data
    }
  }

  const setOdds = (odds: EurojackpotHistoricOdds) => {
    cache.value = {
      data: odds,
      timestamp: Date.now(),
      isLoading: false,
      error: null,
    }
  }

  const clearCache = () => {
    cache.value = {
      data: null,
      timestamp: 0,
      isLoading: false,
      error: null,
    }
  }

  const clearError = () => {
    cache.value.error = null
  }

  // Helper functions
  const waitForLoading = async (): Promise<void> => {
    return new Promise((resolve) => {
      const checkLoading = () => {
        if (!cache.value.isLoading) {
          resolve()
        } else {
          setTimeout(checkLoading, 100) // Check every 100ms
        }
      }
      checkLoading()
    })
  }

  /**
   * Get payout map for quick class -> amount lookups
   */
  const getPayoutMap = (): Record<number, number> => {
    const odds = currentOdds.value
    const map = buildOddsMap(odds)
    const payoutMap: Record<number, number> = {}
    for (const [cls, amt] of map.entries()) {
      payoutMap[cls] = amt
    }
    return payoutMap
  }

  /**
   * Get cache statistics for debugging/monitoring
   */
  const getCacheStats = () => {
    return {
      hasData: !!cache.value.data,
      cacheAge: cache.value.timestamp
        ? Date.now() - cache.value.timestamp
        : null,
      isExpired: isExpired.value,
      isLoading: cache.value.isLoading,
      hasError: !!cache.value.error,
      error: cache.value.error,
    }
  }

  // Return store interface
  return {
    // State (readonly)
    cache: readonly(cache),

    // Computed
    isExpired,
    hasValidCache,
    currentOdds,
    isLoading,
    hasError,

    // Actions
    fetchOdds,
    setOdds,
    clearCache,
    clearError,
    getPayoutMap,
    getCacheStats,
  }
})

export type OddsStore = ReturnType<typeof useOddsStore>
