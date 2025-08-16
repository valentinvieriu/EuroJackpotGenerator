import { z } from 'zod'
import { ticketSchema } from './ticket'
import { batchSimulationResultSchema } from './batchSimulation'
import { eurojackpotHistoricOddsSchema } from './winning'
import { statisticsDataSchema } from './statistics'
import {
  MAIN_NUMBER_MIN,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MIN,
  EURO_NUMBER_MAX,
  MAIN_NUMBERS_COUNT,
  EURO_NUMBERS_COUNT,
  HTTP_ERROR_MIN,
  HTTP_ERROR_MAX,
} from '~/utils/constants'

// API Response validation schemas

export const generateResponseSchema = z.array(ticketSchema)

export const simulateResponseSchema = z.object({
  draw: z.object({
    mainNumbers: z
      .array(z.number().int().min(MAIN_NUMBER_MIN).max(MAIN_NUMBER_MAX))
      .length(MAIN_NUMBERS_COUNT)
      .refine(
        (nums) =>
          nums
            .slice()
            .sort((a, b) => a - b)
            .every((v, i) => v === nums[i]),
        {
          message: 'Main numbers must be sorted',
        }
      ),
    euroNumbers: z
      .array(z.number().int().min(EURO_NUMBER_MIN).max(EURO_NUMBER_MAX))
      .length(EURO_NUMBERS_COUNT)
      .refine(
        (nums) =>
          nums
            .slice()
            .sort((a, b) => a - b)
            .every((v, i) => v === nums[i]),
        {
          message: 'Euro numbers must be sorted',
        }
      ),
  }),
  meta: z.object({
    // Simulate endpoint currently uses only uniform generation
    algorithm: z.literal('uniform'),
    seed: z.string().optional(),
    generatedAt: z.string().datetime(),
  }),
})

export const fetchWinningDataResponseSchema = eurojackpotHistoricOddsSchema

export const fetchFrequenciesResponseSchema = statisticsDataSchema

export const batchSimulateResponseSchema = batchSimulationResultSchema

// Error response schema
export const errorResponseSchema = z.object({
  error: z.boolean(),
  url: z.string(),
  statusCode: z.number().int().min(HTTP_ERROR_MIN).max(HTTP_ERROR_MAX),
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
export type FetchFrequenciesResponse = z.infer<
  typeof fetchFrequenciesResponseSchema
>
export type BatchSimulateResponse = z.infer<typeof batchSimulateResponseSchema>
export type ErrorResponse = z.infer<typeof errorResponseSchema>
