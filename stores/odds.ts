/**
 * Odds Store - Manages cached payout data from external API
 * Reduces redundant API calls and provides fallback handling
 */

import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { EurojackpotHistoricOdds } from '~/schemas'
import { buildOddsMap } from '~/utils/payout'

interface OddsCache {
  data: EurojackpotHistoricOdds | null
  timestamp: number
  isLoading: boolean
  error: string | null
}

// Cache duration in milliseconds (10 minutes to match server cache)
const CACHE_DURATION = 10 * 60 * 1000

/**
 * Default fallback odds when external API is unavailable
 * Based on historical EuroJackpot payout data
 */
const FALLBACK_ODDS: EurojackpotHistoricOdds = {
  eurojackpotGameCycle: {
    cycleNo: 0,
    cycleYear: new Date().getFullYear(),
    eventDate: Date.now(),
    eventWeekday: new Date().getDay(),
    gametableValidFrom: null,
    gametableValidTo: null,
    key: 'fallback-odds-client',
    variantNo: 0,
  },
  eurojackpotOdds: [
    {
      amount: 10000000.0,
      numberOfWins: 0,
      winningClass: 1,
      sequence: 1,
      jackpot: true,
    },
    {
      amount: 750000.0,
      numberOfWins: 0,
      winningClass: 2,
      sequence: 2,
      jackpot: false,
    },
    {
      amount: 100000.0,
      numberOfWins: 0,
      winningClass: 3,
      sequence: 3,
      jackpot: false,
    },
    {
      amount: 5000.0,
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
      amount: 100.0,
      numberOfWins: 0,
      winningClass: 6,
      sequence: 6,
      jackpot: false,
    },
    {
      amount: 50.0,
      numberOfWins: 0,
      winningClass: 7,
      sequence: 7,
      jackpot: false,
    },
    {
      amount: 20.0,
      numberOfWins: 0,
      winningClass: 8,
      sequence: 8,
      jackpot: false,
    },
    {
      amount: 15.0,
      numberOfWins: 0,
      winningClass: 9,
      sequence: 9,
      jackpot: false,
    },
    {
      amount: 12.0,
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
  eurojackpotTurnover: [{ amount: 50000000.0, jurisdiction: 0 }],
}

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
    return cache.value.data || FALLBACK_ODDS
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

      console.warn('Failed to fetch odds data, using fallback:', errorMessage)

      // Return fallback odds on error
      if (!cache.value.data) {
        cache.value.data = FALLBACK_ODDS
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

  const extractErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') return error
    if (error instanceof Error) return error.message
    if (error?.data?.message) return error.data.message
    if (error?.statusText) return error.statusText
    return 'Failed to fetch odds data'
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
