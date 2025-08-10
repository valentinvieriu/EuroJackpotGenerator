import { z } from 'zod'

export const generateRequestSchema = z.object({
  ticketCount: z.number().int().min(1).max(500),
  mainCount: z.number().int().min(5).max(16),
  euroCount: z.number().int().min(2).max(12),
})

export type GenerateRequest = z.infer<typeof generateRequestSchema>
