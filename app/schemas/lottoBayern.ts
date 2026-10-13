import { z } from 'zod'
import { generateRequestSchema } from './generate'
import {
  MAIN_NUMBERS_COUNT,
  EURO_NUMBERS_COUNT,
  LOTTO_BAYERN_NORMAL_FIELD_MAX,
  TICKET_COUNT_MIN,
} from '~/utils/constants'

// Requests from the external bookmarklet are bounded to a standard slip.
// The regular app retains its existing system-ticket and batch limits.
export const lottoBayernGenerateRequestSchema = generateRequestSchema.extend({
  ticketCount: z
    .number()
    .int()
    .min(TICKET_COUNT_MIN)
    .max(LOTTO_BAYERN_NORMAL_FIELD_MAX),
  mainCount: z.literal(MAIN_NUMBERS_COUNT),
  euroCount: z.literal(EURO_NUMBERS_COUNT),
})
