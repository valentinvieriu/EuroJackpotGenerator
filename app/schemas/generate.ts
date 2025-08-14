import { z } from 'zod'
import {
  TICKET_COUNT_MIN,
  TICKET_COUNT_MAX,
  MAIN_SYSTEM_MIN,
  MAIN_SYSTEM_MAX,
  EURO_SYSTEM_MIN,
  EURO_SYSTEM_MAX,
} from '~/utils/constants'

export const generateRequestSchema = z.object({
  ticketCount: z.number().int().min(TICKET_COUNT_MIN).max(TICKET_COUNT_MAX),
  mainCount: z.number().int().min(MAIN_SYSTEM_MIN).max(MAIN_SYSTEM_MAX),
  euroCount: z.number().int().min(EURO_SYSTEM_MIN).max(EURO_SYSTEM_MAX),
  algorithm: z.enum(['uniform', 'weighted']).optional().default('weighted'),
  seed: z.string().optional(),
})

export type GenerateRequest = z.infer<typeof generateRequestSchema>
