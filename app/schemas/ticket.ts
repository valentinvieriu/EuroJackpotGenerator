import { z } from 'zod'

export const ticketSchema = z.object({
  id: z.number().int().positive(),
  mainNumbers: z
    .array(z.number().int().min(1).max(50))
    .min(5)
    .max(16)
    .refine((nums) => new Set(nums).size === nums.length, {
      message: 'Main numbers must be unique',
    }),
  euroNumbers: z
    .array(z.number().int().min(1).max(12))
    .min(2)
    .max(12)
    .refine((nums) => new Set(nums).size === nums.length, {
      message: 'Euro numbers must be unique',
    }),
  linesCount: z.number().int().positive().optional(),
  winClassCounts: z
    .record(z.string(), z.number().int().nonnegative())
    .optional(),
  winningMainNumbers: z.array(z.number().int().min(1).max(50)).optional(),
  winningEuroNumbers: z.array(z.number().int().min(1).max(12)).optional(),
  winClass: z.number().int().min(1).max(12).optional(),
})

export const ticketSetSchema = z.object({
  setNumber: z.number().int().positive(),
  tickets: z.array(ticketSchema),
})

export type Ticket = z.infer<typeof ticketSchema>
export type TicketSet = z.infer<typeof ticketSetSchema>
