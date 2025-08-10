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
})
