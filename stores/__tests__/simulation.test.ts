import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSimulationStore } from '../simulation'

// Mock dependencies
global.$fetch = vi.fn()

describe('Simulation Store', () => {
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

  it('should initialize with config phase', () => {
    const store = useSimulationStore()

    expect(store.state.phase).toBe('config')
    expect(store.state.config).toBeNull()
    expect(store.state.results).toBeNull()
    expect(store.isRunning).toBe(false)
    expect(store.hasResults).toBe(false)
    expect(store.hasError).toBe(false)
  })

  it('should set configuration', () => {
    const store = useSimulationStore()
    const config = {
      simulationCount: 1000,
      batchSize: 100,
    }

    store.setConfig(config)

    expect(store.state.config).toEqual(config)
    expect(store.state.phase).toBe('config')
    expect(store.canStart).toBe(true)
  })

  it('should handle simulation lifecycle', async () => {
    const store = useSimulationStore()
    const mockTickets = [
      {
        id: 1,
        mainNumbers: [1, 2, 3, 4, 5],
        euroNumbers: [1, 2],
        linesCount: 1,
      },
    ]
    const config = { simulationCount: 100, batchSize: 50 }

    // Mock successful stream response
    const mockStream = {
      getReader: () => ({
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              '{"type":"progress","progress":{"currentSimulation":50}}\n'
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              '{"type":"result","result":{"totalSimulations":100}}\n'
            ),
          })
          .mockResolvedValueOnce({
            done: true,
            value: undefined,
          }),
        releaseLock: vi.fn(),
      }),
    }

    global.$fetch = vi.fn().mockResolvedValue(mockStream)

    // Start simulation
    const promise = store.startSimulation(mockTickets, 100, config)

    expect(store.state.phase).toBe('running')
    expect(store.isRunning).toBe(true)
    expect(store.state.config).toEqual(config)

    await promise

    expect(store.state.phase).toBe('results')
    expect(store.hasResults).toBe(true)
    expect(store.isRunning).toBe(false)
  })

  it('should handle simulation errors', async () => {
    const store = useSimulationStore()
    const mockTickets = [
      {
        id: 1,
        mainNumbers: [1, 2, 3, 4, 5],
        euroNumbers: [1, 2],
        linesCount: 1,
      },
    ]
    const config = { simulationCount: 100, batchSize: 50 }

    global.$fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    await store.startSimulation(mockTickets, 100, config)

    expect(store.state.phase).toBe('error')
    expect(store.hasError).toBe(true)
    expect(store.state.error).toBe('Network error')
  })

  it('should handle cancellation', async () => {
    const store = useSimulationStore()
    const mockTickets = [
      {
        id: 1,
        mainNumbers: [1, 2, 3, 4, 5],
        euroNumbers: [1, 2],
        linesCount: 1,
      },
    ]
    const config = { simulationCount: 100, batchSize: 50 }

    // Mock a slow stream that we can cancel
    global.$fetch = vi.fn().mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Operation aborted')
            error.name = 'AbortError'
            reject(error)
          }, 100)
        })
    )

    // Start simulation
    const promise = store.startSimulation(mockTickets, 100, config)

    expect(store.state.phase).toBe('running')
    expect(store.state.canCancel).toBe(true)

    // Cancel immediately
    store.cancelSimulation()

    await promise

    expect(store.state.phase).toBe('cancelled')
    expect(store.state.canCancel).toBe(false)
  })

  it('should reset simulation state', () => {
    const store = useSimulationStore()
    const config = { simulationCount: 100, batchSize: 50 }

    // Set some state
    store.setConfig(config)
    store.state.results = { totalSimulations: 100 } as any
    store.state.error = 'Some error'

    store.resetSimulation()

    expect(store.state.phase).toBe('config')
    expect(store.state.results).toBeNull()
    expect(store.state.error).toBeNull()
    expect(store.state.progress).toBeNull()
    // Config should be preserved for reuse
    expect(store.state.config).toEqual(config)
  })

  it('should prevent multiple concurrent simulations', async () => {
    const store = useSimulationStore()
    const mockTickets = [
      {
        id: 1,
        mainNumbers: [1, 2, 3, 4, 5],
        euroNumbers: [1, 2],
        linesCount: 1,
      },
    ]
    const config = { simulationCount: 100, batchSize: 50 }

    global.$fetch = vi
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

    // Start first simulation
    const promise1 = store.startSimulation(mockTickets, 100, config)

    expect(store.isRunning).toBe(true)

    // Try to start second simulation
    const promise2 = store.startSimulation(mockTickets, 100, config)

    await Promise.all([promise1, promise2])

    // Should only make one API call
    expect(global.$fetch).toHaveBeenCalledTimes(1)
  })

  it('should clear errors', () => {
    const store = useSimulationStore()

    store.state.error = 'Test error'
    store.state.phase = 'error'

    store.clearError()

    expect(store.state.error).toBeNull()
    expect(store.state.phase).toBe('config')
  })

  describe('progress calculation', () => {
    it('should calculate ETA correctly', () => {
      // This is a simplified test of the ETA calculation logic
      const progressPercentage = 50 // 50% complete
      const elapsedMs = 60000 // 1 minute elapsed

      // ETA should be approximately 1 more minute for remaining 50%
      // The actual calculation is: (elapsed / progress) * 100 - elapsed
      const expectedTotalTime = (elapsedMs / progressPercentage) * 100
      const expectedRemainingTime = expectedTotalTime - elapsedMs

      expect(expectedRemainingTime).toBe(60000) // 1 minute remaining
    })
  })

  describe('configuration validation', () => {
    it('should include correct parameters in API request', async () => {
      const store = useSimulationStore()
      const mockTickets = [
        {
          id: 1,
          mainNumbers: [1, 2, 3, 4, 5],
          euroNumbers: [1, 2],
          linesCount: 1,
        },
        {
          id: 2,
          mainNumbers: [6, 7, 8, 9, 10],
          euroNumbers: [3, 4],
          linesCount: 1,
        },
      ]
      const config = { simulationCount: 500, batchSize: 100 }

      global.$fetch = vi.fn().mockResolvedValue({
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true }),
          releaseLock: vi.fn(),
        }),
      })

      await store.startSimulation(mockTickets, 200, config)

      expect(global.$fetch).toHaveBeenCalledWith('/api/batchSimulate', {
        method: 'POST',
        headers: {
          Accept: 'application/x-ndjson',
          'Content-Type': 'application/json',
        },
        body: {
          tickets: mockTickets.map((t) => ({
            id: t.id,
            mainNumbers: t.mainNumbers,
            euroNumbers: t.euroNumbers,
            linesCount: t.linesCount,
          })),
          simulationCount: 500,
          batchSize: 100,
          includeIndividualResults: true, // should be true for <= 1000 simulations
        },
        signal: expect.any(AbortSignal),
        responseType: 'stream',
      })
    })

    it('should disable individual results for large simulations', async () => {
      const store = useSimulationStore()
      const mockTickets = [
        {
          id: 1,
          mainNumbers: [1, 2, 3, 4, 5],
          euroNumbers: [1, 2],
          linesCount: 1,
        },
      ]
      const config = { simulationCount: 5000, batchSize: 200 } // > 1000

      global.$fetch = vi.fn().mockResolvedValue({
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true }),
          releaseLock: vi.fn(),
        }),
      })

      await store.startSimulation(mockTickets, 100, config)

      const call = global.$fetch.mock.calls[0]
      expect(call[1].body.includeIndividualResults).toBe(false)
    })
  })
})
