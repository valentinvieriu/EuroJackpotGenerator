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
    expect(odds.eurojackpotOdds).toHaveLength(12) // All win classes
    expect(odds.eurojackpotOdds[0].winningClass).toBe(1) // Jackpot
  })

  describe('fetchOdds', () => {
    it('should fetch odds from API', async () => {
      const mockOdds = {
        eurojackpotGameCycle: {
          cycleNo: 1,
          cycleYear: 2025,
          eventDate: 1735689600000,
          eventWeekday: 5,
          gametableValidFrom: null,
          gametableValidTo: null,
          key: '2025-01-5',
          variantNo: 0,
        },
        eurojackpotOdds: [
          {
            amount: 50000000,
            numberOfWins: 0,
            winningClass: 1,
            sequence: 1,
            jackpot: true,
          },
          {
            amount: 500000,
            numberOfWins: 1,
            winningClass: 2,
            sequence: 2,
            jackpot: false,
          },
        ],
        eurojackpotTurnover: [{ amount: 100000000, jurisdiction: 0 }],
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
        eurojackpotGameCycle: {
          cycleNo: 1,
          cycleYear: 2025,
          eventDate: 1735689600000,
          eventWeekday: 5,
          gametableValidFrom: null,
          gametableValidTo: null,
          key: '2025-01-5',
          variantNo: 0,
        },
        eurojackpotOdds: [
          {
            amount: 50000000,
            numberOfWins: 0,
            winningClass: 1,
            sequence: 1,
            jackpot: true,
          },
        ],
        eurojackpotTurnover: [{ amount: 100000000, jurisdiction: 0 }],
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
        eurojackpotGameCycle: {
          cycleNo: 1,
          cycleYear: 2025,
          eventDate: 1735689600000,
          eventWeekday: 5,
          gametableValidFrom: null,
          gametableValidTo: null,
          key: '2025-01-5',
          variantNo: 0,
        },
        eurojackpotOdds: [
          {
            amount: 50000000,
            numberOfWins: 0,
            winningClass: 1,
            sequence: 1,
            jackpot: true,
          },
        ],
        eurojackpotTurnover: [{ amount: 100000000, jurisdiction: 0 }],
      }
      const newOdds = {
        eurojackpotGameCycle: {
          cycleNo: 2,
          cycleYear: 2025,
          eventDate: 1735948800000,
          eventWeekday: 2,
          gametableValidFrom: null,
          gametableValidTo: null,
          key: '2025-02-2',
          variantNo: 0,
        },
        eurojackpotOdds: [
          {
            amount: 45000000,
            numberOfWins: 1,
            winningClass: 1,
            sequence: 1,
            jackpot: true,
          },
        ],
        eurojackpotTurnover: [{ amount: 90000000, jurisdiction: 0 }],
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
      expect(result.eurojackpotOdds).toHaveLength(12)
    })

    it('should prevent concurrent requests', async () => {
      global.$fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  eurojackpotGameCycle: {
                    cycleNo: 1,
                    cycleYear: 2025,
                    eventDate: 1735689600000,
                    eventWeekday: 5,
                    gametableValidFrom: null,
                    gametableValidTo: null,
                    key: '2025-01-5',
                    variantNo: 0,
                  },
                  eurojackpotOdds: [],
                  eurojackpotTurnover: [],
                }),
              100
            )
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
        eurojackpotGameCycle: {
          cycleNo: 1,
          cycleYear: 2025,
          eventDate: 1735689600000,
          eventWeekday: 5,
          gametableValidFrom: null,
          gametableValidTo: null,
          key: '2025-01-5',
          variantNo: 0,
        },
        eurojackpotOdds: [
          {
            amount: 50000000,
            numberOfWins: 0,
            winningClass: 1,
            sequence: 1,
            jackpot: true,
          },
        ],
        eurojackpotTurnover: [{ amount: 100000000, jurisdiction: 0 }],
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

    it('should clear error state', async () => {
      global.$fetch = vi.fn().mockRejectedValue(new Error('fail'))

      const store = useOddsStore()
      await store.fetchOdds()
      expect(store.hasError).toBe(true)

      store.clearError()

      expect(store.cache.error).toBeNull()
      expect(store.hasError).toBe(false)
    })
  })

  describe('utility functions', () => {
    it('should create payout map', () => {
      const store = useOddsStore()
      const payoutMap = store.getPayoutMap()

      expect(payoutMap).toBeTruthy()
      expect(payoutMap[1]).toBeGreaterThan(0) // Jackpot class
      expect(payoutMap[12]).toBeGreaterThan(0) // Lowest class
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
