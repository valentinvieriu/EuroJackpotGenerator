import { z } from 'zod'
import { ticketSchema } from './ticket'
import { batchSimulationResultSchema } from './batchSimulation'
import { eurojackpotHistoricOddsSchema } from './winning'

// API Response validation schemas

export const generateResponseSchema = z.array(ticketSchema)

export const simulateResponseSchema = z.object({
  mainNumbers: z.array(z.number().int().min(1).max(50)).length(5),
  euroNumbers: z.array(z.number().int().min(1).max(12)).length(2),
})

export const fetchWinningDataResponseSchema = eurojackpotHistoricOddsSchema

export const batchSimulateResponseSchema = batchSimulationResultSchema

// Error response schema
export const errorResponseSchema = z.object({
  error: z.boolean(),
  url: z.string(),
  statusCode: z.number().int().min(400).max(599),
  statusMessage: z.string(),
  message: z.string(),
  data: z
    .object({
      errors: z.array(z.any()).optional(),
      message: z.string().optional(),
    })
    .optional(),
  stack: z.array(z.string()).optional(),
})

export type GenerateResponse = z.infer<typeof generateResponseSchema>
export type SimulateResponse = z.infer<typeof simulateResponseSchema>
export type FetchWinningDataResponse = z.infer<
  typeof fetchWinningDataResponseSchema
>
export type BatchSimulateResponse = z.infer<typeof batchSimulateResponseSchema>
export type ErrorResponse = z.infer<typeof errorResponseSchema>
