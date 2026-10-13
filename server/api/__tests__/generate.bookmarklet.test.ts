import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LOTTO_BAYERN_ORIGIN } from '~/utils/constants'

let body: unknown
let origin: string
vi.mock('h3', () => ({
  defineEventHandler: (fn: unknown) => fn,
  readBody: vi.fn(async () => body),
  getHeader: vi.fn(() => origin),
  createError: (options: object) => ({ name: 'H3Error', ...options }),
}))
vi.mock('../../utils/statistics', () => ({
  fetchStatistics: vi.fn(async () => null),
}))

beforeEach(() => {
  origin = LOTTO_BAYERN_ORIGIN
})

describe('bookmarklet requests to the existing generator', () => {
  it.each(['uniform', 'weighted', 'favorites', 'unpopular'])(
    'reuses the %s algorithm',
    async (algorithm) => {
      const { default: handler } = await import('../generate')
      body = {
        ticketCount: 2,
        mainCount: 5,
        euroCount: 2,
        algorithm,
        favoriteNumbers: { mainNumbers: [27], euroNumbers: [9] },
      }
      const tickets = await handler({} as any)
      expect(tickets).toHaveLength(2)
      for (const ticket of tickets) {
        expect(ticket.mainNumbers).toHaveLength(5)
        expect(ticket.euroNumbers).toHaveLength(2)
        expect(ticket.linesCount).toBe(1)
      }
    }
  )

  it.each([
    { ticketCount: 13, mainCount: 5, euroCount: 2 },
    { ticketCount: 1, mainCount: 6, euroCount: 2 },
    { ticketCount: 1, mainCount: 5, euroCount: 3 },
  ])(
    'rejects bookmarklet requests exceeding normal-slip limits: %s',
    async (request) => {
      const { default: handler } = await import('../generate')
      body = { ...request, algorithm: 'uniform' }
      await expect(handler({} as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    }
  )

  it('retains regular app system-ticket support', async () => {
    origin = ''
    const { default: handler } = await import('../generate')
    body = { ticketCount: 13, mainCount: 6, euroCount: 3, algorithm: 'uniform' }
    const tickets = await handler({} as any)
    expect(tickets).toHaveLength(13)
    expect(tickets[0].linesCount).toBe(18)
  })
})
