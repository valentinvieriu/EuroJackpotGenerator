import { z } from 'zod'

export const simulateRequestSchema = z
  .object({
    seed: z.string().optional(),
  })
  .optional()
  .default({})

export type SimulateRequest = z.infer<typeof simulateRequestSchema>
