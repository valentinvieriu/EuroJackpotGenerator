import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  generateFromApp,
  generationRequest,
  generatorOrigin,
} from '../generatorClient'
import { parseLines } from '../numbers'
import {
  BOOKMARKLET_APP_ORIGIN,
  BOOKMARKLET_FETCH_TIMEOUT_MS,
} from '../../../app/utils/constants'

const options = {
  appUrl: BOOKMARKLET_APP_ORIGIN,
  algorithm: 'uniform',
  ticketCount: 1,
  favouritesMain: '',
  favouritesEuro: '',
}
const ticket = {
  id: 1,
  mainNumbers: [4, 12, 20, 27, 49],
  euroNumbers: [2, 9],
  linesCount: 1,
}
afterEach(() => vi.useRealTimers())

describe('bookmarklet server generation', () => {
  it.each(['uniform', 'weighted', 'favorites', 'unpopular'])(
    'uses the existing %s server algorithm',
    async (algorithm) => {
      const fetcher = vi.fn(async () => new Response(JSON.stringify([ticket])))
      await expect(
        generateFromApp({ ...options, algorithm }, fetcher)
      ).resolves.toEqual([
        { mains: ticket.mainNumbers, euros: ticket.euroNumbers },
      ])
      const [url, request] = fetcher.mock.calls[0] as unknown as [
        string,
        RequestInit,
      ]
      expect(url).toBe(`${BOOKMARKLET_APP_ORIGIN}/api/generate`)
      expect(request).toMatchObject({
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'error',
      })
      expect(JSON.parse(request.body as string)).toMatchObject({
        ticketCount: 1,
        mainCount: 5,
        euroCount: 2,
        algorithm,
      })
      expect(JSON.parse(request.body as string)).not.toHaveProperty('seed')
    }
  )

  it('sends favourites only for the favourites method', () => {
    expect(
      generationRequest({
        ...options,
        algorithm: 'favorites',
        favouritesMain: '4, 27, 49',
        favouritesEuro: '2 9',
      }).favoriteNumbers
    ).toEqual({ mainNumbers: [4, 27, 49], euroNumbers: [2, 9] })
    expect(
      generationRequest({ ...options, favouritesMain: 'invalid' })
    ).not.toHaveProperty('favoriteNumbers')
  })

  it.each(['4 4', '51', '4.5', '1 2 3 4 5 6'])(
    'rejects invalid favourites before making a request: %s',
    async (favouritesMain) => {
      const fetcher = vi.fn()
      await expect(
        generateFromApp(
          { ...options, algorithm: 'favorites', favouritesMain },
          fetcher
        )
      ).rejects.toThrow()
      expect(fetcher).not.toHaveBeenCalled()
    }
  )

  it.each([0, 13, 1.5, Number.NaN])(
    'rejects invalid line count %s',
    (ticketCount) => {
      expect(() => generationRequest({ ...options, ticketCount })).toThrow()
    }
  )

  it('restricts app URLs to HTTPS or explicit localhost development', () => {
    expect(generatorOrigin('http://localhost:3000/')).toBe(
      'http://localhost:3000'
    )
    for (const url of [
      'http://example.com',
      'https://user:password@example.com',
      `${BOOKMARKLET_APP_ORIGIN}/api`,
      `${BOOKMARKLET_APP_ORIGIN}?token=x`,
      'javascript:alert(1)',
    ]) {
      expect(() => generatorOrigin(url)).toThrow()
    }
  })

  it('rejects HTTP errors, malformed results and system tickets', async () => {
    await expect(
      generateFromApp(options, async () => new Response('', { status: 500 }))
    ).rejects.toThrow('HTTP 500')
    await expect(
      generateFromApp(options, async () => new Response('<html>login</html>'))
    ).rejects.toThrow()
    await expect(
      generateFromApp(
        options,
        async () =>
          new Response(
            JSON.stringify([{ ...ticket, mainNumbers: [1, 2, 3, 4, 5, 6] }])
          )
      )
    ).rejects.toThrow('expected 5')
    await expect(
      generateFromApp(
        options,
        async () => new Response(JSON.stringify([ticket, ticket]))
      )
    ).rejects.toThrow('repeats')
  })

  it('aborts a hung request and releases its timeout', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          )
        })
    )
    const result = generateFromApp(options, fetcher)
    const rejected = expect(result).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(BOOKMARKLET_FETCH_TIMEOUT_MS)
    await rejected
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('bookmarklet imports', () => {
  it('supports app tickets and earlier snippet formats', () => {
    const expected = [{ mains: ticket.mainNumbers, euros: ticket.euroNumbers }]
    for (const input of [
      JSON.stringify([ticket]),
      JSON.stringify({ tickets: [ticket] }),
      JSON.stringify(expected),
      '4 12 20 27 49 | 2 9',
      JSON.stringify({
        mainPrognosises: {
          EUROJACKPOT: [
            {
              prognosises: ticket.mainNumbers,
              additionalPrognosises: ticket.euroNumbers,
            },
          ],
        },
      }),
    ]) {
      expect(parseLines(input)).toEqual(expected)
    }
  })

  it.each([
    '4 4 20 27 49 | 2 9',
    '4 12 20 27 51 | 2 9',
    '4 12 20 27 49 | 2 13',
    '4 12 20 27 49 | 2',
    'alert(1)',
  ])('rejects invalid lines without evaluating them: %s', (input) => {
    expect(() => parseLines(input)).toThrow()
  })
})
