import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { validateInput, validateOutput, fetchWithTimeout } from '../validation'

// Mock createError from h3 used inside validation helpers
vi.mock('h3', () => {
  return {
    createError: (opts: any) => ({ name: 'H3Error', ...opts }),
  }
})

describe('validation utils', () => {
  it('validateInput passes valid data and rejects invalid', () => {
    const schema = z.object({ a: z.number().int() })
    expect(validateInput(schema, { a: 1 }, 'ctx')).toEqual({ a: 1 })
    expect(() => validateInput(schema, { a: 'x' }, 'ctx')).toThrow()
  })

  it('validateOutput passes valid data and rejects invalid', () => {
    const schema = z.object({ b: z.string() })
    expect(validateOutput(schema, { b: 'ok' }, 'resp')).toEqual({ b: 'ok' })
    expect(() => validateOutput(schema, { b: 1 }, 'resp')).toThrow()
  })

  it('fetchWithTimeout returns response (no timeout)', async () => {
    const payload = { ok: true }
    vi.spyOn(globalThis, 'fetch' as any).mockImplementation((_url: string, _opts: any) => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(new Response(JSON.stringify(payload), { status: 200 })), 5)
      })
    })
    const res = await fetchWithTimeout('http://example.com', { timeout: 50 })
    expect(res.ok).toBe(true)
  })
})