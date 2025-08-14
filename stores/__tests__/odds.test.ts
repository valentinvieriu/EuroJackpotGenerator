import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useOddsStore } from '../odds'

// Mock fetch
global.$fetch = vi.fn()

describe('Odds Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Mock useRuntimeConfig
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: {
        apiBase: '/api',
      },
    }))
  })

  it('should initialize with empty cache', () => {
    const store = useOddsStore()

    expect(store.cache.data).toBeNull()
    expect(store.cache.timestamp).toBe(0)
    expect(store.isLoading).toBe(false)
    expect(store.hasError).toBe(false)
    expect(store.isExpired).toBe(true)
  })

  it('should provide fallback odds when no data', () => {
    const store = useOddsStore()

    const odds = store.currentOdds
    expect(odds).toBeTruthy()
    expect(odds.payouts).toHaveLength(12) // All win classes
    expect(odds.payouts[0].winningClass).toBe(1) // Jackpot
  })

  describe('fetchOdds', () => {
    it('should fetch odds from API', async () => {
      const mockOdds = {
        draw: {
          date: '2025-01-01',
          mainNumbers: [1, 2, 3, 4, 5],
          euroNumbers: [1, 2],
        },
        payouts: [
          { winningClass: 1, winners: 0, prize: 50000000 },
          { winningClass: 2, winners: 1, prize: 500000 },
        ],
      }

      global.$fetch = vi.fn().mockResolvedValue(mockOdds)

      const store = useOddsStore()
      const result = await store.fetchOdds()

      expect(global.$fetch).toHaveBeenCalledWith('/api/fetchWinningData', {
        method: 'GET',
      })
      expect(result).toEqual(mockOdds)
      expect(store.cache.data).toEqual(mockOdds)
      expect(store.cache.timestamp).toBeGreaterThan(0)
      expect(store.isLoading).toBe(false)
    })

    it('should return cached data when valid', async () => {
      const store = useOddsStore()
      const mockOdds = {
        draw: {
          date: '2025-01-01',
          mainNumbers: [1, 2, 3, 4, 5],
          euroNumbers: [1, 2],
        },
        payouts: [{ winningClass: 1, winners: 0, prize: 50000000 }],
      }

      // Set cache
      store.setOdds(mockOdds)

      const result = await store.fetchOdds()

      // Should not call API
      expect(global.$fetch).not.toHaveBeenCalled()
      expect(result).toEqual(mockOdds)
    })

    it('should force refresh when requested', async () => {
      const store = useOddsStore()
      const initialOdds = {
        draw: {
          date: '2025-01-01',
          mainNumbers: [1, 2, 3, 4, 5],
          euroNumbers: [1, 2],
        },
        payouts: [{ winningClass: 1, winners: 0, prize: 50000000 }],
      }
      const newOdds = {
        draw: {
          date: '2025-01-02',
          mainNumbers: [6, 7, 8, 9, 10],
          euroNumbers: [3, 4],
        },
        payouts: [{ winningClass: 1, winners: 1, prize: 45000000 }],
      }

      store.setOdds(initialOdds)
      global.$fetch = vi.fn().mockResolvedValue(newOdds)

      const result = await store.fetchOdds(true) // force refresh

      expect(global.$fetch).toHaveBeenCalled()
      expect(result).toEqual(newOdds)
    })

    it('should handle API errors gracefully', async () => {
      global.$fetch = vi.fn().mockRejectedValue(new Error('API Error'))

      const store = useOddsStore()
      const result = await store.fetchOdds()

      expect(store.hasError).toBe(true)
      expect(store.cache.error).toBe('API Error')
      // Should return fallback odds
      expect(result).toBeTruthy()
      expect(result.payouts).toHaveLength(12)
    })

    it('should prevent concurrent requests', async () => {
      global.$fetch = vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ payouts: [] }), 100)
            )
        )

      const store = useOddsStore()

      // Start two concurrent requests
      const promise1 = store.fetchOdds()
      const promise2 = store.fetchOdds()

      await Promise.all([promise1, promise2])

      // Should only make one API call
      expect(global.$fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('cache management', () => {
    it('should detect expired cache', () => {
      const store = useOddsStore()

      // Set timestamp to 11 minutes ago (cache expires after 10 minutes)
      store.cache.timestamp = Date.now() - 11 * 60 * 1000

      expect(store.isExpired).toBe(true)
      expect(store.hasValidCache).toBe(false)
    })

    it('should detect valid cache', () => {
      const store = useOddsStore()
      const mockOdds = {
        draw: {
          date: '2025-01-01',
          mainNumbers: [1, 2, 3, 4, 5],
          euroNumbers: [1, 2],
        },
        payouts: [{ winningClass: 1, winners: 0, prize: 50000000 }],
      }

      store.setOdds(mockOdds)

      expect(store.isExpired).toBe(false)
      expect(store.hasValidCache).toBe(true)
    })

    it('should clear cache', () => {
      const store = useOddsStore()
      const mockOdds = {
        draw: {
          date: '2025-01-01',
          mainNumbers: [1, 2, 3, 4, 5],
          euroNumbers: [1, 2],
        },
        payouts: [{ winningClass: 1, winners: 0, prize: 50000000 }],
      }

      store.setOdds(mockOdds)
      expect(store.cache.data).toBeTruthy()

      store.clearCache()
      expect(store.cache.data).toBeNull()
      expect(store.cache.timestamp).toBe(0)
    })
  })

  describe('utility functions', () => {
    it('should create payout map', () => {
      const store = useOddsStore()
      const payoutMap = store.getPayoutMap()

      expect(payoutMap).toBeTruthy()
      expect(payoutMap[1]).toBeTruthy() // Jackpot class
      expect(payoutMap[12]).toBeTruthy() // Lowest class
    })

    it('should provide cache statistics', () => {
      const store = useOddsStore()
      const stats = store.getCacheStats()

      expect(stats).toHaveProperty('hasData')
      expect(stats).toHaveProperty('cacheAge')
      expect(stats).toHaveProperty('isExpired')
      expect(stats).toHaveProperty('isLoading')
      expect(stats).toHaveProperty('hasError')
    })
  })
})
