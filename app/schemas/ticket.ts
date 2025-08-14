import { z } from 'zod'
import {
  MAIN_NUMBER_MIN,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MIN,
  EURO_NUMBER_MAX,
  MAIN_SYSTEM_MIN,
  MAIN_SYSTEM_MAX,
  EURO_SYSTEM_MIN,
  EURO_SYSTEM_MAX,
  WIN_CLASS_MIN,
  WIN_CLASS_MAX,
} from '~/utils/constants'

export const ticketSchema = z.object({
  id: z.number().int().positive(),
  mainNumbers: z
    .array(z.number().int().min(MAIN_NUMBER_MIN).max(MAIN_NUMBER_MAX))
    .min(MAIN_SYSTEM_MIN)
    .max(MAIN_SYSTEM_MAX)
    .refine((nums) => new Set(nums).size === nums.length, {
      message: 'Main numbers must be unique',
    }),
  euroNumbers: z
    .array(z.number().int().min(EURO_NUMBER_MIN).max(EURO_NUMBER_MAX))
    .min(EURO_SYSTEM_MIN)
    .max(EURO_SYSTEM_MAX)
    .refine((nums) => new Set(nums).size === nums.length, {
      message: 'Euro numbers must be unique',
    }),
  linesCount: z.number().int().positive().optional(),
  winClassCounts: z
    .record(z.string(), z.number().int().nonnegative())
    .optional(),
  winningMainNumbers: z
    .array(z.number().int().min(MAIN_NUMBER_MIN).max(MAIN_NUMBER_MAX))
    .optional(),
  winningEuroNumbers: z
    .array(z.number().int().min(EURO_NUMBER_MIN).max(EURO_NUMBER_MAX))
    .optional(),
  winClass: z.number().int().min(WIN_CLASS_MIN).max(WIN_CLASS_MAX).optional(),
})

export const ticketSetSchema = z.object({
  setNumber: z.number().int().positive(),
  tickets: z.array(ticketSchema),
})

export type Ticket = z.infer<typeof ticketSchema>
export type TicketSet = z.infer<typeof ticketSetSchema>
