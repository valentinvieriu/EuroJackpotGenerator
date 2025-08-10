import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock h3 helpers
let mockBody: any = {}
let mockHeaders: Record<string, string> = {}
const setHeaderMock = vi.fn()
vi.mock('h3', () => {
  return {
    defineEventHandler: (fn: any) => fn,
    readBody: vi.fn(async () => mockBody),
    getHeader: vi.fn(
      (_e: any, name: string) => mockHeaders[name.toLowerCase()] ?? ''
    ),
    setHeader: setHeaderMock,
    sendStream: vi.fn(),
    createError: (opts: any) => ({ name: 'H3Error', ...opts }),
  }
})

const validOddsPayload = {
  eurojackpotGameCycle: {
    cycleNo: 1,
    cycleYear: 2025,
    eventDate: Date.now(),
    eventWeekday: 5,
    gametableValidFrom: null,
    gametableValidTo: null,
    key: '2025-32-5',
    variantNo: 1,
  },
  eurojackpotOdds: Array.from({ length: 12 }, (_, i) => ({
    amount: [1, 750000, 100000, 5000, 300, 100, 50, 20, 15, 12, 10, 8][i] ?? 10,
    numberOfWins: 0,
    winningClass: i + 1,
    sequence: i + 1,
    jackpot: i === 0,
  })),
  eurojackpotTurnover: [{ amount: 1000000, jurisdiction: 0 }],
}

describe('/api/batchSimulate (JSON response)', () => {
  beforeEach(() => {
    mockBody = {}
    mockHeaders = { accept: 'application/json' }
    setHeaderMock.mockClear()
    vi.resetModules()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns aggregated batch results without individual results by default', async () => {
    // Stub external fetch used inside the route to fetch odds
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch' as any)
      .mockResolvedValue(
        new Response(JSON.stringify(validOddsPayload), { status: 200 })
      )

    const { default: handler } = await import('../batchSimulate')
    mockBody = {
      tickets: [
        { id: 1, mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] },
        { id: 2, mainNumbers: [6, 7, 8, 9, 10], euroNumbers: [3, 4] },
      ],
      simulationCount: 10,
      batchSize: 5,
      // includeIndividualResults omitted -> defaults to false
    }

    const res = await handler({} as any)
    expect(fetchSpy).toHaveBeenCalled()
    expect(res).toBeTruthy()
    expect(res?.totalSimulations).toBe(10)
    expect(res?.winDistribution).toBeTruthy()
    expect(res?.statistics).toBeTruthy()
    expect(res?.individualResults).toBeUndefined()
    expect(res?.highlightingData).toBeTruthy()

    // totalCost = costPerSimulation * simulationCount
    // costPerSimulation = sum of lines for both tickets (each 1 line) * €2.0 = 2 * 2 = €4
    expect(res?.totalCost).toBe(4 * 10)
  })

  it('respects includeIndividualResults=true', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify(validOddsPayload), { status: 200 })
    )
    const { default: handler } = await import('../batchSimulate')

    mockBody = {
      tickets: [{ id: 1, mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] }],
      simulationCount: 6,
      batchSize: 3,
      includeIndividualResults: true,
    }

    const res = await handler({} as any)
    expect(res?.individualResults).toBeTruthy()
    expect(Array.isArray(res?.individualResults)).toBe(true)
    expect(res?.individualResults?.length).toBe(6)
  })

  it('uses fallback odds when external fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response('nope', { status: 500 })
    )
    const { default: handler } = await import('../batchSimulate')

    mockBody = {
      tickets: [{ id: 1, mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] }],
      simulationCount: 3,
      batchSize: 2,
    }

    const res = await handler({} as any)
    expect(res?.totalSimulations).toBe(3)
    // Should still compute something with fallback data
    expect(res?.winDistribution.totalWins).toBeGreaterThanOrEqual(0)
  })

  it('validates Accept header and throws 406 for unsupported types', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify(validOddsPayload), { status: 200 })
    )
    const { default: handler } = await import('../batchSimulate')

    // force a weird Accept
    mockHeaders = { accept: 'text/html' }
    mockBody = {
      tickets: [{ id: 1, mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] }],
      simulationCount: 1,
    }
    await expect(handler({} as any)).rejects.toMatchObject({
      statusCode: 406,
    })
  })
})
