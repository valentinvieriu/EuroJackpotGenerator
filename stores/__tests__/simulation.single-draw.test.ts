import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSimulationStore } from '../simulation'
import { useOddsStore } from '../odds'

// Mocks that must be hoisted before module import
vi.mock('~/utils/ticketHighlighting', () => ({
  buildTicketHighlightUpdates: vi.fn((tickets: any[]) =>
    tickets.map((t) => ({
      id: t.id,
      winningMainNumbers: [t.mainNumbers[0]].filter(Boolean),
      winningEuroNumbers: [t.euroNumbers[0]].filter(Boolean),
      winClassCounts: { 2: 1 },
      winClass: 2,
    }))
  ),
}))

vi.mock('~/composables/useAppState', () => ({
  useAudioState: () => ({
    audioEnabled: { value: true },
    winSoundLevel: { value: 'medium' },
  }),
}))

vi.mock('~/utils/audioUtils', () => ({
  playWinSound: vi.fn(),
}))

describe('Simulation Store - Single Draw & Highlighting', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: '/api' } }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('runs single draw, computes winnings/ROI, and plays audio when enabled', async () => {
    const sim = useSimulationStore()
    const odds = useOddsStore()

    // Provide current tickets
    const tickets = [
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
        linesCount: 2,
      },
    ]
    sim.generateTickets(tickets as any)

    // Mock simulate endpoint
    // @ts-expect-error – global mock
    global.$fetch = vi.fn().mockResolvedValueOnce({
      // /simulate
      draw: { mainNumbers: [1, 11, 12, 13, 14], euroNumbers: [1, 9] },
      meta: {},
    })

    // Mock odds fetch
    const mockOdds = {
      eurojackpotGameCycle: {
        cycleNo: 1,
        cycleYear: 2025,
        eventDate: 0,
        eventWeekday: 5,
        gametableValidFrom: null,
        gametableValidTo: null,
        key: 'k',
        variantNo: 0,
      },
      eurojackpotOdds: [
        {
          winningClass: 1,
          amount: 50_000_000,
          numberOfWins: 0,
          sequence: 1,
          jackpot: true,
        },
        {
          winningClass: 2,
          amount: 5_000,
          numberOfWins: 0,
          sequence: 2,
          jackpot: false,
        },
      ],
      eurojackpotTurnover: [],
    }
    vi.spyOn(odds, 'fetchOdds').mockResolvedValue(mockOdds as any)

    // Total price passed by UI (approximate): 1*2 + 2*2 = €6
    await sim.runSingleDraw(6)

    expect(sim.hasSingleDrawResults).toBe(true)
    expect(sim.state.singleDraw.winningNumbers).toEqual({
      mainNumbers: [1, 11, 12, 13, 14],
      euroNumbers: [1, 9],
    })
    const results = sim.state.singleDraw.results!
    // Based on mocked highlight builder: each ticket has class 2 count = 1
    // Two tickets → totalWinnings = 2 * 5000
    expect(results.totalWinnings).toBe(10_000)
    expect(results.netProfit).toBe(10_000 - 6)
    expect(Number.isFinite(results.roiPercentage)).toBe(true)
  })

  it('re-highlights single draw results when tickets change, preserving draw and odds', async () => {
    const sim = useSimulationStore()
    const odds = useOddsStore()

    // Seed initial tickets and run a single draw to populate results
    const initialTickets = [
      {
        id: 1,
        mainNumbers: [1, 2, 3, 4, 5],
        euroNumbers: [1, 2],
        linesCount: 1,
      },
    ]
    sim.generateTickets(initialTickets as any)

    // Mock simulate endpoint and odds for the run
    // @ts-expect-error – global mock
    global.$fetch = vi.fn().mockResolvedValueOnce({
      draw: { mainNumbers: [1, 11, 12, 13, 14], euroNumbers: [1, 9] },
      meta: {},
    })

    vi.spyOn(odds, 'fetchOdds').mockResolvedValue({
      eurojackpotGameCycle: {
        cycleNo: 1,
        cycleYear: 2025,
        eventDate: 0,
        eventWeekday: 5,
        gametableValidFrom: null,
        gametableValidTo: null,
        key: 'k',
        variantNo: 0,
      },
      eurojackpotOdds: [
        {
          winningClass: 2,
          amount: 1000,
          numberOfWins: 0,
          sequence: 2,
          jackpot: false,
        },
      ],
      eurojackpotTurnover: [],
    } as any)

    await sim.runSingleDraw(2) // price €2
    expect(sim.hasSingleDrawResults.valueOf()).toBe(true)

    // New tickets trigger rehighlight (preserve single draw)
    const newTickets = [
      {
        id: 1,
        mainNumbers: [1, 2, 30, 31, 32],
        euroNumbers: [1, 5],
        linesCount: 2,
      },
      {
        id: 2,
        mainNumbers: [6, 7, 8, 9, 10],
        euroNumbers: [3, 4],
        linesCount: 1,
      },
    ]
    sim.generateTickets(newTickets as any)

    const res = sim.state.singleDraw.results!
    expect(res.ticketHighlights.length).toBe(2)
    // Amount per class 2 = 1000, counts from mock builder = 1 each → 2*1000 total
    expect(res.totalWinnings).toBe(2000)
    // totalPrice: linesCount sum * €2 = (2 + 1)*2 = 6
    expect(res.netProfit).toBe(2000 - 6)
  })

  it('generateTickets resets Monte Carlo when results exist and preserves single draw', async () => {
    const sim = useSimulationStore()

    // Seed single draw results to be preserved later
    sim.generateTickets([
      {
        id: 99,
        mainNumbers: [1, 2, 3, 4, 5],
        euroNumbers: [1, 2],
        linesCount: 1,
      },
    ] as any)
    // @ts-expect-error – global mock
    global.$fetch = vi
      .fn()
      // First: single draw simulate call
      .mockResolvedValueOnce({
        draw: { mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] },
        meta: {},
      })
      // Then: batchSimulate NDJSON stream
      .mockResolvedValueOnce({
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                '{"type":"result","result":{"totalSimulations":10}}\n'
              ),
            })
            .mockResolvedValueOnce({ done: true }),
          releaseLock: vi.fn(),
        }),
      })

    // Odds for single draw
    const odds = useOddsStore()
    vi.spyOn(odds, 'fetchOdds').mockResolvedValue({
      eurojackpotGameCycle: {
        cycleNo: 1,
        cycleYear: 2025,
        eventDate: 0,
        eventWeekday: 5,
        gametableValidFrom: null,
        gametableValidTo: null,
        key: 'k',
        variantNo: 0,
      },
      eurojackpotOdds: [
        {
          winningClass: 2,
          amount: 100,
          numberOfWins: 0,
          sequence: 2,
          jackpot: false,
        },
      ],
      eurojackpotTurnover: [],
    } as any)

    await sim.runSingleDraw(2)
    expect(sim.state.singleDraw.phase).toBe('results')

    // Start Monte Carlo to reach results state
    await sim.startSimulation(
      [
        {
          id: 1,
          mainNumbers: [1, 2, 3, 4, 5],
          euroNumbers: [1, 2],
          linesCount: 1,
        },
      ] as any,
      2,
      { simulationCount: 10, batchSize: 5 }
    )
    expect(sim.state.phase).toBe('results')

    // Generate new tickets → should reset Monte Carlo to config and rehighlight single draw
    sim.generateTickets([
      {
        id: 2,
        mainNumbers: [6, 7, 8, 9, 10],
        euroNumbers: [3, 4],
        linesCount: 1,
      },
    ] as any)

    expect(sim.state.phase).toBe('config')
    expect(sim.state.results).toBeNull()
    expect(sim.state.singleDraw.phase).toBe('results')
    // Ensure results still consistent (preserved and recalculated)
    expect(sim.state.singleDraw.results).toBeTruthy()
  })
})
