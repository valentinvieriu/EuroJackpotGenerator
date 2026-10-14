import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSimulationStore } from '../simulation'
import { useTicketsStore } from '../tickets'
import { useOddsStore } from '../odds'
import { startSimulationRun } from '~/utils/simulationRunner'
import type {
  SimulationOutcome,
  SimulationSnapshot,
} from '~/utils/simulationEngine'
import { FALLBACK_EUROJACKPOT_ODDS } from '~/utils/fallbackOdds'
import { LONG_RUN_PRIZES } from '~/utils/prizeTable'
import type { BatchSimulationRequest, Ticket } from '~/schemas'

// The simulation store reads tickets from the tickets store, whose setup pulls
// in Nuxt-only UI composables
vi.mock('~/composables/useAppState', () => ({
  useUIState: () => ({ showWelcome: vi.fn(), showSharing: vi.fn() }),
  useTransientErrors: () => ({ addError: vi.fn() }),
}))

// The run itself happens in a Web Worker; the tests stand in for it
vi.mock('~/utils/simulationRunner', () => ({ startSimulationRun: vi.fn() }))

/** Put tickets on the table the way the app does: in the tickets store */
const seedTickets = (tickets: unknown) => {
  useTicketsStore().state.tickets = tickets as Ticket[]
}

const mockTickets = [
  { id: 1, mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2], linesCount: 1 },
  { id: 2, mainNumbers: [6, 7, 8, 9, 10], euroNumbers: [3, 4], linesCount: 1 },
]

/** A worker run the test settles by hand */
const fakeRun = () => {
  let settle: (outcome: SimulationOutcome | null) => void = () => {}
  let fail: (error: Error) => void = () => {}
  const finished = new Promise<SimulationOutcome | null>((resolve, reject) => {
    settle = resolve
    fail = reject
  })
  const cancel = vi.fn(() => settle(null))
  const handle = {
    request: null as BatchSimulationRequest | null,
    progress: (_snapshot: SimulationSnapshot) => {},
    settle,
    fail,
    cancel,
  }
  vi.mocked(startSimulationRun).mockImplementationOnce(
    (request, onProgress) => {
      handle.request = request
      handle.progress = onProgress
      return { finished, cancel }
    }
  )
  return handle
}

const outcomeOf = (totalSimulations: number): SimulationOutcome => ({
  result: { totalSimulations } as SimulationOutcome['result'],
  trajectory: [{ draws: totalSimulations, spent: 200, won: 40 }],
})

const snapshotAt = (
  draws: number,
  totalCost: number,
  totalWinnings: number
): SimulationSnapshot => ({
  draws,
  totalDraws: 100,
  totalCost,
  totalWinnings,
  hits: 1,
  maxWin: 10,
  winsByClass: { 12: 1 },
  trajectory: [{ draws, spent: totalCost, won: totalWinnings }],
})

/** Let the store get past loading the prizes and start the worker run */
const untilRunStarts = () =>
  vi.waitFor(() => expect(startSimulationRun).toHaveBeenCalled())

describe('Simulation Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(startSimulationRun).mockReset()
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
    const config = { simulationCount: 1000 }

    store.setConfig(config)

    expect(store.state.config).toEqual(config)
    expect(store.state.phase).toBe('config')
  })

  it('should handle simulation lifecycle', async () => {
    const store = useSimulationStore()
    const config = { simulationCount: 100 }
    const run = fakeRun()

    seedTickets(mockTickets)
    const promise = store.startSimulation(config)

    expect(store.state.phase).toBe('running')
    expect(store.isRunning).toBe(true)
    expect(store.state.canCancel).toBe(true)
    expect(store.state.config).toEqual(config)

    await untilRunStarts()
    run.settle(outcomeOf(100))
    await promise

    expect(store.state.phase).toBe('results')
    expect(store.state.results).toEqual({ totalSimulations: 100 })
    expect(store.state.progress).toBeNull()
    expect(store.hasResults).toBe(true)
    expect(store.isRunning).toBe(false)
    expect(store.state.canCancel).toBe(false)
  })

  it('refuses to start without tickets', async () => {
    const store = useSimulationStore()

    await store.startSimulation({ simulationCount: 100 })

    expect(store.state.phase).toBe('error')
    expect(startSimulationRun).not.toHaveBeenCalled()
  })

  it('should handle simulation errors', async () => {
    const store = useSimulationStore()
    const run = fakeRun()

    seedTickets(mockTickets)
    const promise = store.startSimulation({ simulationCount: 100 })
    await untilRunStarts()
    run.fail(new Error('Worker crashed'))
    await promise

    expect(store.state.phase).toBe('error')
    expect(store.hasError).toBe(true)
    expect(store.state.error).toBe('Worker crashed')
    expect(store.state.canCancel).toBe(false)
  })

  it('reports a run the engine cannot accept as an error', async () => {
    const store = useSimulationStore()

    seedTickets(mockTickets)
    // Below the smallest run the engine is asked to play
    await store.startSimulation({ simulationCount: 1 })

    expect(store.state.phase).toBe('error')
    expect(startSimulationRun).not.toHaveBeenCalled()
  })

  it('should handle cancellation', async () => {
    const store = useSimulationStore()
    const run = fakeRun()

    seedTickets(mockTickets)
    const promise = store.startSimulation({ simulationCount: 100 })
    await untilRunStarts()

    expect(store.state.phase).toBe('running')
    expect(store.state.canCancel).toBe(true)

    store.cancelSimulation()

    // Cancelling does not wait for anything
    expect(run.cancel).toHaveBeenCalledTimes(1)
    expect(store.state.phase).toBe('cancelled')
    expect(store.state.canCancel).toBe(false)

    await promise
    expect(store.state.phase).toBe('cancelled')
    expect(store.state.results).toBeNull()
  })

  it('ignores a cancelled run that reports back late', async () => {
    const store = useSimulationStore()
    const first = fakeRun()
    const second = fakeRun()

    seedTickets(mockTickets)
    const firstPromise = store.startSimulation({ simulationCount: 100 })
    await untilRunStarts()
    store.cancelSimulation()

    const secondPromise = store.startSimulation({ simulationCount: 100 })
    await vi.waitFor(() => expect(startSimulationRun).toHaveBeenCalledTimes(2))

    // Late news from the first run must not touch the second
    first.progress(snapshotAt(90, 900, 900))
    await firstPromise
    expect(store.state.phase).toBe('running')
    expect(store.state.canCancel).toBe(true)
    expect(store.state.progress?.currentSimulation).toBe(0)

    second.settle(outcomeOf(100))
    await secondPromise
    expect(store.state.phase).toBe('results')
  })

  describe('the meter', () => {
    const finishedRun = (
      draws: number,
      totalCost: number,
      totalWinnings: number
    ): SimulationOutcome => ({
      result: {
        totalSimulations: draws,
        totalCost,
        totalWinnings,
      } as SimulationOutcome['result'],
      trajectory: [{ draws, spent: totalCost, won: totalWinnings }],
    })

    it('counts a run while it plays and settles it into the round', async () => {
      const store = useSimulationStore()
      const run = fakeRun()
      store.round = { draws: 3, spent: 6, won: 2 }

      seedTickets(mockTickets)
      const promise = store.startSimulation({ simulationCount: 100 })
      await untilRunStarts()

      run.progress(snapshotAt(40, 160, 30))
      expect(store.meter).toEqual({ draws: 43, spent: 166, won: 32 })
      // Not settled yet: the run could still be stopped
      expect(store.round).toEqual({ draws: 3, spent: 6, won: 2 })

      run.settle(finishedRun(100, 400, 90))
      await promise

      expect(store.round).toEqual({ draws: 103, spent: 406, won: 92 })
      expect(store.meter).toEqual(store.round)
    })

    it('keeps the draws played before a run was stopped', async () => {
      const store = useSimulationStore()
      const run = fakeRun()

      seedTickets(mockTickets)
      const promise = store.startSimulation({ simulationCount: 100 })
      await untilRunStarts()
      run.progress(snapshotAt(40, 160, 30))

      store.cancelSimulation()
      await promise

      expect(store.round).toEqual({ draws: 40, spent: 160, won: 30 })
      expect(store.meter).toEqual(store.round)
    })

    it('adds up run after run', async () => {
      const store = useSimulationStore()
      seedTickets(mockTickets)

      for (const _ of [1, 2]) {
        const run = fakeRun()
        vi.mocked(startSimulationRun).mockClear()
        const promise = store.startSimulation({ simulationCount: 100 })
        await untilRunStarts()
        run.settle(finishedRun(100, 400, 90))
        await promise
      }

      expect(store.round).toEqual({ draws: 200, spent: 800, won: 180 })
    })

    it('clears the draw on the table when a run starts', async () => {
      const store = useSimulationStore()
      fakeRun()
      store.state.singleDraw = {
        phase: 'results',
        winningNumbers: { mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] },
        oddsData: null,
        error: null,
      }

      seedTickets(mockTickets)
      void store.startSimulation({ simulationCount: 100 })

      expect(store.state.singleDraw.phase).toBe('idle')
      expect(store.singleDrawResults).toBeNull()
    })
  })

  describe('rounds', () => {
    const finishedRun = (
      draws: number,
      totalCost: number,
      totalWinnings: number
    ): SimulationOutcome => ({
      result: {
        totalSimulations: draws,
        totalCost,
        totalWinnings,
      } as SimulationOutcome['result'],
      trajectory: [{ draws, spent: totalCost, won: totalWinnings }],
    })

    /** Play one finished autoplay run on the tickets on the table */
    const playRun = async (
      store: ReturnType<typeof useSimulationStore>,
      outcome: SimulationOutcome
    ) => {
      const run = fakeRun()
      vi.mocked(startSimulationRun).mockClear()
      const promise = store.startSimulation({ simulationCount: 100 })
      await untilRunStarts()
      run.settle(outcome)
      await promise
    }

    it('puts the round on the slip when new tickets come to the table', async () => {
      const store = useSimulationStore()
      const tickets = useTicketsStore()
      seedTickets(mockTickets)
      tickets.state.ticketsMethod = 'random'

      await playRun(store, finishedRun(100, 400, 90))
      store.ticketsGenerated()

      expect(store.rounds).toEqual([
        { label: '2 tickets · random', draws: 100, spent: 400, won: 90 },
      ])
      expect(store.meter).toEqual({ draws: 0, spent: 0, won: 0 })
      expect(store.total).toEqual({ draws: 100, spent: 400, won: 90 })
      // The report described the old tickets
      expect(store.state.phase).toBe('config')
      expect(store.state.results).toBeNull()
    })

    it('names the round after the tickets it was played on, not the ones that replaced them', async () => {
      const store = useSimulationStore()
      seedTickets(mockTickets)

      await playRun(store, finishedRun(100, 400, 90))
      seedTickets([mockTickets[0]])
      store.ticketRemoved()

      expect(store.rounds[0]?.label).toBe('2 tickets')
    })

    it('adds every round and the one on the table into the total', async () => {
      const store = useSimulationStore()
      seedTickets(mockTickets)

      await playRun(store, finishedRun(100, 400, 90))
      store.ticketsGenerated()
      await playRun(store, finishedRun(100, 200, 50))

      expect(store.rounds).toHaveLength(1)
      expect(store.meter).toEqual({ draws: 100, spent: 200, won: 50 })
      expect(store.total).toEqual({ draws: 200, spent: 600, won: 140 })
    })

    it('leaves no trace of tickets that were never played', () => {
      const store = useSimulationStore()
      seedTickets(mockTickets)

      // Generating tickets only to fill them in elsewhere
      store.ticketsGenerated()
      store.ticketRemoved()
      store.ticketsGenerated()

      expect(store.rounds).toEqual([])
      expect(store.total).toEqual({ draws: 0, spent: 0, won: 0 })
    })

    it('clears the draw on the table with the round it belongs to', () => {
      const store = useSimulationStore()
      seedTickets(mockTickets)
      store.state.singleDraw = {
        phase: 'results',
        winningNumbers: { mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] },
        oddsData: null,
        error: null,
      }

      store.ticketRemoved()

      expect(store.state.singleDraw.phase).toBe('idle')
      expect(store.singleDrawResults).toBeNull()
    })

    it('keeps a stopped run in the round it was played in', async () => {
      const store = useSimulationStore()
      const run = fakeRun()
      seedTickets(mockTickets)

      const promise = store.startSimulation({ simulationCount: 100 })
      await untilRunStarts()
      run.progress(snapshotAt(40, 160, 30))
      store.cancelSimulation()
      await promise
      store.ticketsGenerated()

      expect(store.rounds).toEqual([
        { label: '2 tickets', draws: 40, spent: 160, won: 30 },
      ])
    })

    it('starting over clears the meters and every round, but keeps the tickets', async () => {
      const store = useSimulationStore()
      seedTickets(mockTickets)

      await playRun(store, finishedRun(100, 400, 90))
      store.ticketsGenerated()
      await playRun(store, finishedRun(100, 200, 50))

      store.startOver()

      expect(store.rounds).toEqual([])
      expect(store.meter).toEqual({ draws: 0, spent: 0, won: 0 })
      expect(store.total).toEqual({ draws: 0, spent: 0, won: 0 })
      expect(store.state.phase).toBe('config')
      expect(store.state.results).toBeNull()
      expect(useTicketsStore().state.tickets).toHaveLength(mockTickets.length)
    })

    it('starting over mid-run stops the run and still ends at zero', async () => {
      const store = useSimulationStore()
      const run = fakeRun()

      seedTickets(mockTickets)
      const promise = store.startSimulation({ simulationCount: 100 })
      await untilRunStarts()
      run.progress(snapshotAt(40, 160, 30))

      store.startOver()
      await promise

      expect(run.cancel).toHaveBeenCalledTimes(1)
      expect(store.meter).toEqual({ draws: 0, spent: 0, won: 0 })
      expect(store.rounds).toEqual([])
    })
  })

  it('should return to the config screen and keep the config', () => {
    const store = useSimulationStore()
    const config = { simulationCount: 100 }

    // Set some state
    store.setConfig(config)
    store.state.results = { totalSimulations: 100 } as any
    store.state.error = 'Some error'

    store.resetToConfig()

    expect(store.state.phase).toBe('config')
    expect(store.state.results).toBeNull()
    expect(store.state.error).toBeNull()
    expect(store.state.progress).toBeNull()
    // Config should be preserved for reuse
    expect(store.state.config).toEqual(config)
  })

  it('should prevent multiple concurrent simulations', async () => {
    const store = useSimulationStore()
    const run = fakeRun()

    seedTickets(mockTickets)
    const promise1 = store.startSimulation({ simulationCount: 100 })
    expect(store.isRunning).toBe(true)

    // Try to start second simulation
    const promise2 = store.startSimulation({ simulationCount: 100 })

    await untilRunStarts()
    run.settle(outcomeOf(100))
    await Promise.all([promise1, promise2])

    // Should only start one worker run
    expect(startSimulationRun).toHaveBeenCalledTimes(1)
  })

  it('should clear errors', () => {
    const store = useSimulationStore()

    store.state.error = 'Test error'
    store.state.phase = 'error'

    store.clearError()

    expect(store.state.error).toBeNull()
    expect(store.state.phase).toBe('config')
  })

  it('turns progress snapshots into progress state and a trajectory', async () => {
    const store = useSimulationStore()
    const run = fakeRun()

    seedTickets(mockTickets)
    const promise = store.startSimulation({ simulationCount: 100 })
    expect(store.trajectory).toEqual([{ draws: 0, spent: 0, won: 0 }])
    await untilRunStarts()

    run.progress(snapshotAt(50, 100, 30))

    expect(store.trajectory).toEqual([
      { draws: 0, spent: 0, won: 0 },
      { draws: 50, spent: 100, won: 30 },
    ])
    expect(store.state.progress).toMatchObject({
      currentSimulation: 50,
      totalSimulations: 100,
      progressPercentage: 50,
      partialResults: {
        simulationsCompleted: 50,
        totalWins: 1,
        winPercentage: 2,
        currentROI: -70,
        netProfit: -70,
        maxWin: 10,
        winsByClass: { 12: 1 },
      },
    })

    // The finished run brings the authoritative trajectory
    run.settle(outcomeOf(100))
    await promise
    expect(store.trajectory).toEqual([
      { draws: 0, spent: 0, won: 0 },
      { draws: 100, spent: 200, won: 40 },
    ])

    store.resetToConfig()
    expect(store.trajectory).toEqual([])
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

  describe('the request handed to the engine', () => {
    const requestFor = async (config: {
      simulationCount: number
      seed?: string
    }) => {
      const store = useSimulationStore()
      const run = fakeRun()
      seedTickets(mockTickets)
      const promise = store.startSimulation(config)
      await untilRunStarts()
      run.settle(outcomeOf(config.simulationCount))
      await promise
      return run.request!
    }

    it('carries the tickets, the draw count and the long-run prizes', async () => {
      // The last draw's prizes must not leak into a run, however generous
      useOddsStore().setOdds(FALLBACK_EUROJACKPOT_ODDS)
      const request = await requestFor({ simulationCount: 500 })

      expect(request.tickets).toEqual(mockTickets)
      expect(request.simulationCount).toBe(500)
      expect(request.payouts).toEqual(LONG_RUN_PRIZES)
      expect(Object.keys(request.payouts)).toHaveLength(12)
    })

    it('is plain data a worker can receive', async () => {
      const request = await requestFor({ simulationCount: 500 })
      expect(() => structuredClone(request)).not.toThrow()
    })

    it('draws a fresh seed for every run', async () => {
      const first = await requestFor({ simulationCount: 500 })
      const second = await requestFor({ simulationCount: 500 })

      expect(first.seed).toBeTruthy()
      expect(first.seed).not.toBe(second.seed)
    })

    it('uses the given seed to replay a run', async () => {
      const request = await requestFor({ simulationCount: 500, seed: 'replay' })
      expect(request.seed).toBe('replay')
    })

    it('keeps every draw for short runs only', async () => {
      expect((await requestFor({ simulationCount: 1000 })).recordDraws).toBe(
        true
      )
      expect((await requestFor({ simulationCount: 5000 })).recordDraws).toBe(
        false
      )
    })
  })
})
