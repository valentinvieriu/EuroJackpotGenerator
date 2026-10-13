import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSimulationStore } from '../simulation'
import { useOddsStore } from '../odds'
import { useTicketsStore } from '../tickets'
import type { Ticket } from '~/schemas'
import { startSimulationRun } from '~/utils/simulationRunner'

// The Monte Carlo run happens in a Web Worker; the tests stand in for it
vi.mock('~/utils/simulationRunner', () => ({ startSimulationRun: vi.fn() }))

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

// The simulation store reads tickets from the tickets store, whose setup pulls
// in Nuxt-only UI composables
vi.mock('~/composables/useAppState', () => ({
  useUIState: () => ({ showWelcome: vi.fn(), showSharing: vi.fn() }),
  useTransientErrors: () => ({ addError: vi.fn() }),
}))

/** Put tickets on the table the way the app does: in the tickets store */
const seedTickets = (tickets: unknown) => {
  useTicketsStore().state.tickets = tickets as Ticket[]
}

describe('Simulation Store - Single Draw & Highlighting', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: '/api' } }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('runs single draw and computes winnings/ROI', async () => {
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
    seedTickets(tickets as any)

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

    // Stake comes from the tickets: (1 + 2) lines × €2 = €6
    await sim.runSingleDraw()

    expect(sim.hasSingleDrawResults).toBe(true)
    expect(sim.state.singleDraw.winningNumbers).toEqual({
      mainNumbers: [1, 11, 12, 13, 14],
      euroNumbers: [1, 9],
    })
    const results = sim.singleDrawResults!
    // Based on mocked highlight builder: each ticket has class 2 count = 1
    // Two tickets → totalWinnings = 2 * 5000
    expect(results.totalWinnings).toBe(10_000)
    expect(results.netProfit).toBe(10_000 - 6)
    expect(Number.isFinite(results.roiPercentage)).toBe(true)
  })

  it('re-scores the same draw when the tickets change', async () => {
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
    seedTickets(initialTickets as any)

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

    await sim.runSingleDraw()
    expect(sim.hasSingleDrawResults).toBe(true)

    // New tickets on the table: the same draw is scored against them
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
    seedTickets(newTickets as any)

    const res = sim.singleDrawResults!
    expect(res.ticketHighlights.length).toBe(2)
    // Amount per class 2 = 1000, counts from mock builder = 1 each → 2*1000 total
    expect(res.totalWinnings).toBe(2000)
    // totalPrice: linesCount sum * €2 = (2 + 1)*2 = 6
    expect(res.netProfit).toBe(2000 - 6)
  })

  it('new tickets reset a finished Monte Carlo run but keep the single draw', async () => {
    const sim = useSimulationStore()

    // Seed single draw results to be preserved later
    seedTickets([
      {
        id: 99,
        mainNumbers: [1, 2, 3, 4, 5],
        euroNumbers: [1, 2],
        linesCount: 1,
      },
    ] as any)
    // The single draw's simulate call
    // @ts-expect-error – global mock
    global.$fetch = vi.fn().mockResolvedValueOnce({
      draw: { mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] },
      meta: {},
    })
    // The Monte Carlo run finishes as soon as it starts
    vi.mocked(startSimulationRun).mockReturnValueOnce({
      finished: Promise.resolve({
        result: { totalSimulations: 100 } as any,
        trajectory: [],
      }),
      cancel: vi.fn(),
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

    // Monte Carlo first: starting a run clears the draw on the table
    await sim.startSimulation({ simulationCount: 100 })
    expect(sim.state.phase).toBe('results')

    await sim.runSingleDraw()
    expect(sim.state.singleDraw.phase).toBe('results')

    // Generate new tickets → should reset Monte Carlo to config and rehighlight single draw
    seedTickets([
      {
        id: 2,
        mainNumbers: [6, 7, 8, 9, 10],
        euroNumbers: [3, 4],
        linesCount: 1,
      },
    ] as any)
    sim.ticketsGenerated()

    expect(sim.state.phase).toBe('config')
    expect(sim.state.results).toBeNull()
    expect(sim.state.singleDraw.phase).toBe('results')
    // Ensure results still consistent (preserved and recalculated)
    expect(sim.singleDrawResults).toBeTruthy()
  })

  it('keeps a running session ledger across draws and clears it on reset', async () => {
    const sim = useSimulationStore()
    const odds = useOddsStore()

    seedTickets([
      {
        id: 1,
        mainNumbers: [1, 2, 3, 4, 5],
        euroNumbers: [1, 2],
        linesCount: 1,
      },
    ] as any)

    // @ts-expect-error – global mock
    global.$fetch = vi.fn().mockResolvedValue({
      draw: { mainNumbers: [1, 11, 12, 13, 14], euroNumbers: [1, 9] },
      meta: {},
    })
    vi.spyOn(odds, 'fetchOdds').mockResolvedValue({
      eurojackpotOdds: [
        {
          winningClass: 2,
          amount: 5,
          numberOfWins: 0,
          sequence: 2,
          jackpot: false,
        },
      ],
    } as any)

    expect(sim.session).toEqual({ draws: 0, spent: 0, won: 0 })

    // Mocked highlight builder awards one class-2 win (€5) per ticket
    await sim.runSingleDraw()
    expect(sim.session).toEqual({ draws: 1, spent: 2, won: 5 })

    await sim.runSingleDraw()
    expect(sim.session).toEqual({ draws: 2, spent: 4, won: 10 })

    sim.ticketsReset()
    expect(sim.session).toEqual({ draws: 0, spent: 0, won: 0 })
  })

  it('does not charge the session ledger when a draw fails', async () => {
    const sim = useSimulationStore()
    const odds = useOddsStore()

    seedTickets([
      {
        id: 1,
        mainNumbers: [1, 2, 3, 4, 5],
        euroNumbers: [1, 2],
        linesCount: 1,
      },
    ] as any)

    // @ts-expect-error – global mock
    global.$fetch = vi.fn().mockRejectedValue(new Error('network down'))
    vi.spyOn(odds, 'fetchOdds').mockResolvedValue({
      eurojackpotOdds: [],
    } as any)

    await sim.runSingleDraw()

    expect(sim.state.singleDraw.phase).toBe('error')
    expect(sim.session).toEqual({ draws: 0, spent: 0, won: 0 })
  })
})
