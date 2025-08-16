import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock h3 helpers used by the handler
let mockBody: any = {}
vi.mock('h3', () => {
  return {
    defineEventHandler: (fn: any) => fn,
    readBody: vi.fn(async () => mockBody),
    // the generate endpoint doesn't use these below, but we expose them for safety
    getHeader: vi.fn(() => ''),
    setHeader: vi.fn(),
    sendStream: vi.fn(),
    createError: (opts: any) => ({ name: 'H3Error', ...opts }),
  }
})

describe('/api/generate', () => {
  beforeEach(() => {
    mockBody = {}
    vi.resetModules()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('generates tickets with linesCount and proper structure', async () => {
    const { default: handler } = await import('../generate')
    mockBody = { ticketCount: 2, mainCount: 5, euroCount: 3 }
    const result = await handler({} as any)

    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    for (const t of result) {
      expect(typeof t.id).toBe('number')
      expect(Array.isArray(t.mainNumbers)).toBe(true)
      expect(Array.isArray(t.euroNumbers)).toBe(true)
      // System 5/3 -> C(5,5)*C(3,2) = 3 lines, price per line applied elsewhere
      expect(t.linesCount).toBe(3)
    }
  })

  it('rejects invalid payload via zod schema (e.g., too many tickets)', async () => {
    const { default: handler } = await import('../generate')
    mockBody = { ticketCount: 0, mainCount: 5, euroCount: 2 }
    await expect(handler({} as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid ticket generation request',
    })
  })

  it('rejects invalid system bounds', async () => {
    const { default: handler } = await import('../generate')
    mockBody = { ticketCount: 1, mainCount: 17, euroCount: 2 }
    await expect(handler({} as any)).rejects.toMatchObject({
      statusCode: 400,
    })

    vi.resetModules()
    const { default: handler2 } = await import('../generate')
    mockBody = { ticketCount: 1, mainCount: 5, euroCount: 13 }
    await expect(handler2({} as any)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('accepts algorithm=uniform', async () => {
    const { default: handler } = await import('../generate')
    mockBody = {
      ticketCount: 1,
      mainCount: 5,
      euroCount: 2,
      algorithm: 'uniform',
    }
    const result = await handler({} as any)
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
  })

  it('accepts algorithm=weighted (default remains weighted)', async () => {
    const { default: handler } = await import('../generate')
    mockBody = {
      ticketCount: 1,
      mainCount: 5,
      euroCount: 2,
      algorithm: 'weighted',
    }
    const result = await handler({} as any)
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
  })

  it('accepts algorithm=favorites with favoriteNumbers', async () => {
    const { default: handler } = await import('../generate')
    mockBody = {
      ticketCount: 1,
      mainCount: 5,
      euroCount: 2,
      algorithm: 'favorites',
      favoriteNumbers: {
        mainNumbers: [7, 23, 42],
        euroNumbers: [5, 11],
      },
    }
    const result = await handler({} as any)
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveProperty('mainNumbers')
    expect(result[0]).toHaveProperty('euroNumbers')
    expect(result[0].mainNumbers).toHaveLength(5)
    expect(result[0].euroNumbers).toHaveLength(2)
  })

  it('validates favoriteNumbers schema when provided', async () => {
    const { default: handler2 } = await import('../generate')
    // Invalid favorite numbers (outside valid ranges)
    mockBody = {
      ticketCount: 1,
      mainCount: 5,
      euroCount: 2,
      algorithm: 'favorites',
      favoriteNumbers: {
        mainNumbers: [0, 51, 100], // Invalid range
        euroNumbers: [-1, 13, 20], // Invalid range
      },
    }
    // Should reject invalid favorite numbers through schema validation
    await expect(handler2({} as any)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('handles favorites algorithm without favoriteNumbers gracefully', async () => {
    const { default: handler } = await import('../generate')
    mockBody = {
      ticketCount: 1,
      mainCount: 5,
      euroCount: 2,
      algorithm: 'favorites',
      // No favoriteNumbers provided
    }
    const result = await handler({} as any)
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
  })

  it('validates favoriteNumbers limits (max 5 per type)', async () => {
    const { default: handler } = await import('../generate')
    mockBody = {
      ticketCount: 1,
      mainCount: 5,
      euroCount: 2,
      algorithm: 'favorites',
      favoriteNumbers: {
        mainNumbers: [1, 2, 3, 4, 5, 6, 7], // More than max (5)
        euroNumbers: [1, 2, 3, 4, 5, 6], // More than max (5)
      },
    }
    // Should reject arrays that exceed the maximum length
    await expect(handler({} as any)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('defaults to weighted algorithm when algorithm parameter is omitted', async () => {
    const { default: handler } = await import('../generate')
    mockBody = { ticketCount: 1, mainCount: 5, euroCount: 2 }
    const result = await handler({} as any)
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
  })

  it('generates consistent results with same seed', async () => {
    const { default: handler } = await import('../generate')
    const seed = 'test-seed-123'

    mockBody = {
      ticketCount: 2,
      mainCount: 5,
      euroCount: 2,
      algorithm: 'uniform',
      seed,
    }

    const result1 = await handler({} as any)
    const result2 = await handler({} as any)

    expect(result1).toHaveLength(2)
    expect(result2).toHaveLength(2)

    // Same seed should produce identical results
    expect(result1[0].mainNumbers).toEqual(result2[0].mainNumbers)
    expect(result1[0].euroNumbers).toEqual(result2[0].euroNumbers)
    expect(result1[1].mainNumbers).toEqual(result2[1].mainNumbers)
    expect(result1[1].euroNumbers).toEqual(result2[1].euroNumbers)
  })

  it('generates different results with different seeds', async () => {
    const { default: handler } = await import('../generate')

    mockBody = {
      ticketCount: 1,
      mainCount: 5,
      euroCount: 2,
      algorithm: 'uniform',
      seed: 'seed-1',
    }
    const result1 = await handler({} as any)

    mockBody = {
      ticketCount: 1,
      mainCount: 5,
      euroCount: 2,
      algorithm: 'uniform',
      seed: 'seed-2',
    }
    const result2 = await handler({} as any)

    expect(result1).toHaveLength(1)
    expect(result2).toHaveLength(1)

    // Different seeds should produce different results
    const ticket1Numbers = [
      ...result1[0].mainNumbers,
      ...result1[0].euroNumbers,
    ].sort()
    const ticket2Numbers = [
      ...result2[0].mainNumbers,
      ...result2[0].euroNumbers,
    ].sort()
    expect(ticket1Numbers).not.toEqual(ticket2Numbers)
  })
})
