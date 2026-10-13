import {
  BOOKMARKLET_ALGORITHMS,
  BOOKMARKLET_FETCH_TIMEOUT_MS,
  EURO_NUMBER_MAX,
  EURO_NUMBERS_COUNT,
  FAVORITE_NUMBERS_MAX,
  GENERATE_API_PATH,
  LOTTO_BAYERN_NORMAL_FIELD_MAX,
  MAIN_NUMBER_MAX,
  MAIN_NUMBERS_COUNT,
  TICKET_COUNT_MIN,
} from '../../app/utils/constants'
import { integers, parseLines } from './numbers'

export interface GeneratorOptions {
  appUrl: string
  algorithm: string
  ticketCount: number
  favouritesMain: string
  favouritesEuro: string
}

export function generatorOrigin(value: string): string {
  const url = new URL(value)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (
    (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== '/' && url.pathname !== '')
  ) {
    throw new Error(
      'Enter the app’s HTTPS origin only, without a path, credentials, query, or fragment.'
    )
  }
  return url.origin
}

export function generationRequest(options: GeneratorOptions) {
  if (
    !BOOKMARKLET_ALGORITHMS.some((option) => option.value === options.algorithm)
  ) {
    throw new Error('Choose a supported generation method.')
  }
  if (
    !Number.isInteger(options.ticketCount) ||
    options.ticketCount < TICKET_COUNT_MIN ||
    options.ticketCount > LOTTO_BAYERN_NORMAL_FIELD_MAX
  ) {
    throw new Error(
      `Generate ${TICKET_COUNT_MIN} to ${LOTTO_BAYERN_NORMAL_FIELD_MAX} lines.`
    )
  }
  const favouriteNumbers = (value: string, max: number) => {
    const numbers = integers(value)
    if (
      numbers.length > FAVORITE_NUMBERS_MAX ||
      new Set(numbers).size !== numbers.length ||
      !numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= max)
    ) {
      throw new Error(
        `Enter up to ${FAVORITE_NUMBERS_MAX} distinct favourite integers from 1 to ${max}.`
      )
    }
    return numbers
  }
  return {
    ticketCount: options.ticketCount,
    mainCount: MAIN_NUMBERS_COUNT,
    euroCount: EURO_NUMBERS_COUNT,
    algorithm: options.algorithm,
    ...(options.algorithm === 'favorites'
      ? {
          favoriteNumbers: {
            mainNumbers: favouriteNumbers(
              options.favouritesMain,
              MAIN_NUMBER_MAX
            ),
            euroNumbers: favouriteNumbers(
              options.favouritesEuro,
              EURO_NUMBER_MAX
            ),
          },
        }
      : {}),
  }
}

export async function generateFromApp(
  options: GeneratorOptions,
  fetcher: typeof fetch = fetch
) {
  const origin = generatorOrigin(options.appUrl)
  const body = generationRequest(options)
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    BOOKMARKLET_FETCH_TIMEOUT_MS
  )
  try {
    const response = await fetcher(`${origin}${GENERATE_API_PATH}`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify(body),
    })
    if (!response.ok)
      throw new Error(`App generation failed (HTTP ${response.status}).`)
    const rows = parseLines(JSON.stringify(await response.json()))
    if (rows.length !== options.ticketCount)
      throw new Error('The app returned an unexpected number of lines.')
    return rows
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(
        'App generation timed out. Check the app before retrying.'
      )
    if (error instanceof TypeError) {
      throw new TypeError(
        'Cannot reach the generator. Check the app URL, connection, and deployed Lotto Bayern CORS support.'
      )
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
