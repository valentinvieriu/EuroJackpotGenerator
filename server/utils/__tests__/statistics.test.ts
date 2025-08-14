import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('server statistics', () => {
  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('caches successful fetch result for ~10 minutes', async () => {
    const validStats = {
      numbers: [{ number: 1, value: 10 }],
      additionalNumbers: [{ number: 1, value: 5 }],
    }
    // Return a fresh Response on each call to avoid reusing a consumed body
    const fetchMock = vi
      .spyOn(globalThis, 'fetch' as any)
      .mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(validStats), { status: 200 })
        )
      )
    const { fetchStatistics } = await import('../statistics')

    // First call hits network
    const a = await fetchStatistics()
    expect(a).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Second call should hit cache
    const b = await fetchStatistics()
    expect(b).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Advance time beyond cache (10 minutes)
    vi.setSystemTime(Date.now() + 11 * 60 * 1000)
    const c = await fetchStatistics()
    expect(c).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns null on invalid structure and resets cache', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(JSON.stringify({ not: 'valid' }), { status: 200 })
    )
    const { fetchStatistics } = await import('../statistics')
    const res = await fetchStatistics()
    expect(res).toBeNull()
  })
})
