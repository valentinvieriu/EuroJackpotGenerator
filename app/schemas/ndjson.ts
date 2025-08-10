import { z } from 'zod'
import {
  batchSimulationResultSchema,
  batchSimulationProgressSchema,
} from './batchSimulation'

// NDJSON event frame schemas
export const ndjsonProgressEventSchema = z.object({
  type: z.literal('progress'),
  progress: batchSimulationProgressSchema,
  summary: z.object({
    winDistribution: z.object({
      totalWins: z.number().int().nonnegative(),
      winPercentage: z.number().min(0).max(100),
      winsByClass: z.record(z.string(), z.number().int().nonnegative()),
    }),
    roiPercentage: z.number(),
    netProfit: z.number(),
    maxWin: z.number().nonnegative(),
  }),
})

export const ndjsonResultEventSchema = z.object({
  type: z.literal('result'),
  result: batchSimulationResultSchema,
})

export const ndjsonErrorEventSchema = z.object({
  type: z.literal('error'),
  error: z.string(),
})

export const ndjsonEventSchema = z.union([
  ndjsonProgressEventSchema,
  ndjsonResultEventSchema,
  ndjsonErrorEventSchema,
])

export type NdjsonProgressEvent = z.infer<typeof ndjsonProgressEventSchema>
export type NdjsonResultEvent = z.infer<typeof ndjsonResultEventSchema>
export type NdjsonErrorEvent = z.infer<typeof ndjsonErrorEventSchema>
export type NdjsonEvent = z.infer<typeof ndjsonEventSchema>
