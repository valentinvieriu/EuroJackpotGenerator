import { describe, expect, it } from 'vitest'
import { createApp, defineEventHandler, toWebHandler } from 'h3'
import cors from '../lottoBayernCors'
import { LOTTO_BAYERN_ORIGIN } from '~/utils/constants'

function request(path: string, init: RequestInit) {
  const app = createApp()
    .use(cors)
    .use(defineEventHandler(() => ({ ok: true })))
  return toWebHandler(app)(
    new Request(`https://generator.example${path}`, init)
  )
}

describe('Lotto Bayern generator CORS', () => {
  it('answers the JSON POST preflight without running generation', async () => {
    const response = await request('/api/generate', {
      method: 'OPTIONS',
      headers: {
        Origin: LOTTO_BAYERN_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    })
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      LOTTO_BAYERN_ORIGIN
    )
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST')
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
      'Content-Type'
    )
    expect(response.headers.has('Access-Control-Allow-Credentials')).toBe(false)
  })

  it('adds CORS to generation responses', async () => {
    const response = await request('/api/generate', {
      method: 'POST',
      headers: { Origin: LOTTO_BAYERN_ORIGIN },
    })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      LOTTO_BAYERN_ORIGIN
    )
    expect(response.headers.get('Vary')?.toLowerCase()).toContain('origin')
  })

  it('does not open other origins, endpoints, or same-origin app requests', async () => {
    for (const [path, origin] of [
      ['/api/generate', 'https://example.com'],
      ['/api/simulate', LOTTO_BAYERN_ORIGIN],
      ['/api/generate', ''],
    ]) {
      const response = await request(path, {
        method: 'POST',
        headers: origin ? { Origin: origin } : {},
      })
      expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false)
    }
  })
})
