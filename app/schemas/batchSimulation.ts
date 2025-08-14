import { z } from 'zod'
import { ticketSchema } from './ticket'
import {
  MAIN_NUMBER_MIN,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MIN,
  EURO_NUMBER_MAX,
  MAIN_NUMBERS_COUNT,
  EURO_NUMBERS_COUNT,
  TICKET_COUNT_MIN,
  TICKET_COUNT_MAX,
  SIMULATION_COUNT_MIN,
  SIMULATION_COUNT_MAX,
  PERCENTAGE_MIN,
  PERCENTAGE_MAX,
} from '~/utils/constants'

export const winDistributionSchema = z.object({
  winsByClass: z.record(z.string(), z.number().int().nonnegative()),
  totalWins: z.number().int().nonnegative(),
  totalLosses: z.number().int().nonnegative(),
  winPercentage: z.number().min(PERCENTAGE_MIN).max(PERCENTAGE_MAX),
})

export const simulationStatisticsSchema = z.object({
  meanWinnings: z.number(),
  medianWinnings: z.number().nonnegative(),
  standardDeviation: z.number().nonnegative(),
  minWinnings: z.number().nonnegative(),
  maxWinnings: z.number().nonnegative(),
  percentile25: z.number().nonnegative(),
  percentile75: z.number().nonnegative(),
  percentile95: z.number().nonnegative(),
  profitableSimulations: z.number().int().nonnegative(),
  profitablePercentage: z.number().min(PERCENTAGE_MIN).max(PERCENTAGE_MAX),
})

export const individualSimulationResultSchema = z.object({
  simulationIndex: z.number().int().nonnegative(),
  winningNumbers: z.object({
    mainNumbers: z
      .array(z.number().int().min(MAIN_NUMBER_MIN).max(MAIN_NUMBER_MAX))
      .length(MAIN_NUMBERS_COUNT),
    euroNumbers: z
      .array(z.number().int().min(EURO_NUMBER_MIN).max(EURO_NUMBER_MAX))
      .length(EURO_NUMBERS_COUNT),
  }),
  totalWinnings: z.number().nonnegative(),
  netProfit: z.number(),
  winsByClass: z.record(z.string(), z.number().int().nonnegative()),
})

export const ticketHighlightingDataSchema = z.object({
  ticketStats: z.record(
    z.string(),
    z.object({
      mainNumberFrequency: z.record(z.string(), z.number().int().nonnegative()),
      euroNumberFrequency: z.record(z.string(), z.number().int().nonnegative()),
      winClassCounts: z.record(z.string(), z.number().int().nonnegative()),
      totalWins: z.number().int().nonnegative(),
    })
  ),
})

export const batchSimulationResultSchema = z.object({
  totalSimulations: z.number().int().positive(),
  totalCost: z.number().nonnegative(),
  totalWinnings: z.number().nonnegative(),
  netProfit: z.number(),
  roiPercentage: z.number(),
  expectedValue: z.number(),
  winDistribution: winDistributionSchema,
  statistics: simulationStatisticsSchema,
  individualResults: z.array(individualSimulationResultSchema).optional(),
  highlightingData: ticketHighlightingDataSchema.optional(),
})

export const batchSimulationRequestSchema = z.object({
  tickets: z.array(ticketSchema).min(TICKET_COUNT_MIN).max(TICKET_COUNT_MAX),
  simulationCount: z
    .number()
    .int()
    .min(SIMULATION_COUNT_MIN)
    .max(SIMULATION_COUNT_MAX),
  includeIndividualResults: z.boolean().optional().default(false),
  batchSize: z.number().int().positive().optional().default(100),
})

export const batchSimulationProgressSchema = z.object({
  currentSimulation: z.number().int().nonnegative(),
  totalSimulations: z.number().int().positive(),
  progressPercentage: z.number().min(PERCENTAGE_MIN).max(PERCENTAGE_MAX),
  estimatedTimeRemaining: z.string().nullable().optional(),
  canCancel: z.boolean(),
})

export type WinDistribution = z.infer<typeof winDistributionSchema>
export type SimulationStatistics = z.infer<typeof simulationStatisticsSchema>
export type IndividualSimulationResult = z.infer<
  typeof individualSimulationResultSchema
>
export type TicketHighlightingData = z.infer<
  typeof ticketHighlightingDataSchema
>
export type BatchSimulationResult = z.infer<typeof batchSimulationResultSchema>
export type BatchSimulationRequest = z.infer<
  typeof batchSimulationRequestSchema
>
export type BatchSimulationProgress = z.infer<
  typeof batchSimulationProgressSchema
>
