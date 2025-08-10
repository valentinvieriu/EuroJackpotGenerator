import { z } from 'zod'

export const statisticsDataSchema = z.object({
  numbers: z.array(
    z.object({
      number: z.number().int().min(1).max(50),
      value: z.number().nonnegative(),
    })
  ),
  additionalNumbers: z.array(
    z.object({
      number: z.number().int().min(1).max(12),
      value: z.number().nonnegative(),
    })
  ),
})

export type StatisticsData = z.infer<typeof statisticsDataSchema>
