import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTicketsStore } from '../tickets'
import { useSimulationStore } from '../simulation'
import { useOddsStore } from '../odds'

// Shared stubs and helpers
const mockHistoryReplace = vi.fn()

vi.mock('~/utils/urlHash', () => ({
  encodeAppConfigToHash: vi.fn(
    (cfg: any) =>
      `system=${cfg.system}&tickets=${cfg.tickets}&method=${cfg.method}${cfg.lucky ? `&lucky=${cfg.lucky}` : ''}`
  ),
  decodeUrlHash: vi.fn((hash: string) => {
    if (hash.startsWith('#valid')) {
      return { system: '6x3', tickets: 3, method: 'uniform', lucky: 'LUCKY' }
    }
    return null
  }),
  parseTicketType: vi.fn((s: string) => {
    if (s === '6x3') return { mainCount: 6, euroCount: 3 }
    if (s === '5x2') return { mainCount: 5, euroCount: 2 }
    return null
  }),
  formatTicketType: vi.fn((m: number, e: number) => `${m}x${e}`),
  generateLuckyCode: vi.fn(() => 'NEWCODE'),
}))

vi.mock('~/utils/pricing', () => ({
  systemPrice: vi.fn((m: number, e: number) => (m === 5 && e === 2 ? 2 : 4)),
}))

const uiState = {
  setLoading: vi.fn(),
  showWelcome: vi.fn(),
  showSharing: vi.fn(),
}

const transientErrors = { addError: vi.fn() }

vi.mock('~/composables/useAppState', () => ({
  useUIState: () => uiState,
  useTransientErrors: () => transientErrors,
}))

describe('Tickets Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Mock runtime config
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { apiBase: '/api' },
    }))

    // Mock window for URL updates
    // @ts-expect-error – partial window mock for tests
    global.window = {
      location: { pathname: '/', hash: '' },
      history: { replaceState: mockHistoryReplace },
    }

    // Ensure odds and simulation stores are initialized (used indirectly)
    useOddsStore()
    useSimulationStore()
  })

  afterEach(() => {
    // @ts-expect-error – cleanup window mock
    delete global.window
    vi.unstubAllGlobals()
  })

  it('generates tickets successfully and notifies simulation store', async () => {
    const ticketsApiResponse = [
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
    // @ts-expect-error – global mock
    global.$fetch = vi.fn().mockResolvedValue(ticketsApiResponse)

    const ticketsStore = useTicketsStore()
    const simStore = useSimulationStore()
    const spyGenerate = vi.spyOn(simStore, 'generateTickets')

    // Configure store
    ticketsStore.updateConfig({
      mainCount: 5,
      euroCount: 2,
      ticketCount: 2,
      method: 'weighted',
    })

    await ticketsStore.generate()

    expect(global.$fetch).toHaveBeenCalledWith('/api/generate', {
      method: 'POST',
      body: {
        ticketCount: 2,
        mainCount: 5,
        euroCount: 2,
        algorithm: 'weighted',
      },
    })
    expect(ticketsStore.state.phase).toBe('ready')
    expect(ticketsStore.state.tickets).toEqual(ticketsApiResponse)
    expect(ticketsStore.state.lastGenerated).toBeGreaterThan(0)
    expect(spyGenerate).toHaveBeenCalledWith(ticketsApiResponse)
    expect(uiState.setLoading).toHaveBeenCalledWith('generate')
    expect(uiState.setLoading).toHaveBeenLastCalledWith(null)
  })

  it('adds seed when luckyCode is set', async () => {
    const ticketsApiResponse: any[] = []
    // @ts-expect-error – global mock
    global.$fetch = vi.fn().mockResolvedValue(ticketsApiResponse)

    const ticketsStore = useTicketsStore()
    ticketsStore.setLuckyCode('SEED123', 'SHARED')
    ticketsStore.updateConfig({
      ticketCount: 1,
      method: 'uniform',
      mainCount: 5,
      euroCount: 2,
    })

    await ticketsStore.generate()

    expect(global.$fetch).toHaveBeenCalledWith('/api/generate', {
      method: 'POST',
      body: expect.objectContaining({
        algorithm: 'uniform',
        seed: 'SEED123',
      }),
    })
  })

  it('validates ticketCount and sets error without calling API', async () => {
    // @ts-expect-error – global mock
    global.$fetch = vi.fn()
    const ticketsStore = useTicketsStore()
    ticketsStore.updateConfig({ ticketCount: 0 })

    await ticketsStore.generate()

    expect(ticketsStore.state.phase).toBe('error')
    expect(ticketsStore.state.error).toMatch(/valid number of tickets/i)
    expect(global.$fetch).not.toHaveBeenCalled()
  })

  it('guards against concurrent generate calls', async () => {
    // Simulate slow fetch
    // @ts-expect-error – global mock
    global.$fetch = vi
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      )

    const ticketsStore = useTicketsStore()
    ticketsStore.updateConfig({ ticketCount: 1 })

    const p1 = ticketsStore.generate()
    const p2 = ticketsStore.generate()
    await Promise.all([p1, p2])

    expect(global.$fetch).toHaveBeenCalledTimes(1)
  })

  it('updateConfig debounces URL updates when fresh', async () => {
    vi.useFakeTimers()
    const ticketsStore = useTicketsStore()
    ticketsStore.updateConfig({
      mainCount: 5,
      euroCount: 2,
      ticketCount: 3,
      method: 'weighted',
    })

    // Debounce pending
    expect(mockHistoryReplace).not.toHaveBeenCalled()
    vi.advanceTimersByTime(250)
    expect(mockHistoryReplace).toHaveBeenCalledTimes(1)
    const url = (mockHistoryReplace.mock.calls[0][2] as string) || ''
    expect(url).toContain('#system=5x2')
    expect(url).toContain('tickets=3')
    expect(url).toContain('method=weighted')
    vi.useRealTimers()
  })

  it('applyUrlConfig with lucky triggers auto-generate and welcome', async () => {
    // @ts-expect-error – global mock
    global.$fetch = vi.fn().mockResolvedValue([])
    const ticketsStore = useTicketsStore()

    await ticketsStore.applyUrlConfig({
      system: '6x3',
      tickets: 3,
      method: 'uniform',
      lucky: 'LUCKY',
    })

    expect(ticketsStore.state.config.mainCount).toBe(6)
    expect(ticketsStore.state.config.euroCount).toBe(3)
    expect(ticketsStore.state.config.ticketCount).toBe(3)
    expect(ticketsStore.state.config.method).toBe('uniform')
    expect(ticketsStore.state.appState).toBe('SHARED')
    expect(ticketsStore.state.luckyCode).toBe('LUCKY')
    expect(uiState.showWelcome).toHaveBeenCalledWith('LUCKY', 12000)
    expect(global.$fetch).toHaveBeenCalled() // auto-generate called
  })

  it('handleUrlConfiguration updates from hash and SSR-guards', async () => {
    // Valid hash path
    // @ts-expect-error – use existing mock window
    global.window.location.hash = '#valid'
    const ticketsStore = useTicketsStore()
    await ticketsStore.handleUrlConfiguration()
    expect(ticketsStore.state.appState).toBe('SHARED')

    // SSR path: no window
    // @ts-expect-error – remove window
    delete global.window
    const ticketsStore2 = useTicketsStore()
    await ticketsStore2.handleUrlConfiguration()
    // Should not throw; no assertions needed beyond not crashing
  })

  it('share reuses luckyCode in SHARED and generates new in FRESH', async () => {
    const ticketsStore = useTicketsStore()
    // FRESH → generates new
    ticketsStore.setLuckyCode('', 'FRESH')
    await ticketsStore.share()
    expect(uiState.showSharing).toHaveBeenCalledWith('NEWCODE')

    // SHARED → reuse existing
    uiState.showSharing.mockClear()
    ticketsStore.setLuckyCode('EXISTING', 'SHARED')
    await ticketsStore.share()
    expect(uiState.showSharing).toHaveBeenCalledWith('EXISTING')
  })

  it('reset clears tickets and URL, and notifies simulation store', async () => {
    const ticketsStore = useTicketsStore()
    const simStore = useSimulationStore()
    const spyResetTickets = vi.spyOn(simStore, 'resetTickets')

    // Ensure there are tickets first via generate()
    // @ts-expect-error – global mock
    global.$fetch = vi
      .fn()
      .mockResolvedValue([
        { id: 1, mainNumbers: [], euroNumbers: [], linesCount: 1 },
      ])
    await ticketsStore.generate()

    // Set an error to verify it clears
    ;(ticketsStore.state as any).error = 'err'

    ticketsStore.reset()

    expect(ticketsStore.state.tickets).toEqual([])
    expect(ticketsStore.state.phase).toBe('fresh')
    expect(ticketsStore.state.error).toBeNull()
    expect(spyResetTickets).toHaveBeenCalled()
    expect(mockHistoryReplace).toHaveBeenCalledWith(null, '', '/')
  })

  it('getDecoratedTickets merges highlights and sorts by winClass', async () => {
    const ticketsStore = useTicketsStore()
    const simStore = useSimulationStore()

    // Create tickets via generate() to avoid readonly mutations
    // @ts-expect-error – global mock
    global.$fetch = vi.fn().mockResolvedValue([
      { id: 2, mainNumbers: [], euroNumbers: [], linesCount: 1 },
      { id: 1, mainNumbers: [], euroNumbers: [], linesCount: 1 },
      { id: 3, mainNumbers: [], euroNumbers: [], linesCount: 1 },
    ])
    await ticketsStore.generate()

    // Provide highlights: id 3 wins class 2, id 1 wins class 5, id 2 no win
    vi.spyOn(simStore, 'getHighlightsForMode').mockReturnValue([
      {
        id: 1,
        winningMainNumbers: [],
        winningEuroNumbers: [],
        winClassCounts: { 5: 1 },
        winClass: 5,
      },
      {
        id: 3,
        winningMainNumbers: [],
        winningEuroNumbers: [],
        winClassCounts: { 2: 3 },
        winClass: 2,
      },
    ])

    const decorated = ticketsStore.getDecoratedTickets('single')
    expect(decorated.map((t: any) => t.id)).toEqual([3, 1, 2])
    const t3 = decorated[0]
    expect(t3.winClass).toBe(2)
    expect(t3.winningMainNumbers).toEqual([])
  })
})
