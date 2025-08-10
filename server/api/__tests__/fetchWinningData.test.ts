import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Minimal valid payload per zod schema
const validOdds = {
  eurojackpotGameCycle: {
    cycleNo: 1,
    cycleYear: 2025,
    eventDate: 1730000000000,
    eventWeekday: 5,
    gametableValidFrom: null,
    gametableValidTo: null,
    key: '2025-32-5',
    variantNo: 1,
  },
  eurojackpotOdds: Array.from({ length: 12 }, (_, i) => ({
    amount: 10 + i,
    numberOfWins: 0,
    winningClass: i + 1,
    sequence: i + 1,
    jackpot: i === 0,
  })),
  eurojackpotTurnover: [{ amount: 1000000, jurisdiction: 0 }],
}

vi.mock('h3', () => {
  return {
    defineEventHandler: (fn: any) => fn,
    // not used directly here, but kept for compatibility
    createError: (opts: any) => ({ name: 'H3Error', ...opts }),
  }
})

describe('/api/fetchWinningData', () => {
  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns validated winning data when external API succeeds', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify(validOdds), { status: 200 })
    )
    const { default: handler } = await import('../fetchWinningData')
    const res = await handler({} as any)

    expect(fetchSpy).toHaveBeenCalled()
    expect(res.eurojackpotOdds).toHaveLength(12)
    expect(res.eurojackpotGameCycle.key).toBe('2025-32-5')
  })

  it('returns fallback data when external API returns !ok', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response('nope', { status: 500 })
    )
    const { default: handler } = await import('../fetchWinningData')
    const res = await handler({} as any)

    expect(res.eurojackpotGameCycle.key).toBe('fallback-data-key')
    expect(res.eurojackpotOdds.length).toBe(12)
  })
})