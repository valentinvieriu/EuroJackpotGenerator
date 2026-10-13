import {
  defineEventHandler,
  getHeader,
  getRequestURL,
  handleCors,
  setHeader,
} from 'h3'
import {
  BOOKMARKLET_CORS_MAX_AGE,
  GENERATE_API_PATH,
  LOTTO_BAYERN_ORIGIN,
} from '~/utils/constants'

export default defineEventHandler((event) => {
  if (
    getRequestURL(event).pathname !== GENERATE_API_PATH ||
    getHeader(event, 'origin') !== LOTTO_BAYERN_ORIGIN
  ) {
    return
  }

  // The generator is public and does not require account cookies. Do not
  // broaden CORS for simulations, odds, credentials, or arbitrary websites.
  if (event.method === 'OPTIONS') {
    setHeader(event, 'Access-Control-Max-Age', String(BOOKMARKLET_CORS_MAX_AGE))
  }
  handleCors(event, {
    origin: [LOTTO_BAYERN_ORIGIN],
    methods: ['POST'],
    allowHeaders: ['Content-Type'],
    credentials: false,
  })
})
