import { z } from 'zod'
import {
  MAIN_NUMBER_MIN,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MIN,
  EURO_NUMBER_MAX,
} from '~/utils/constants'

export const statisticsDataSchema = z.object({
  numbers: z.array(
    z.object({
      number: z.number().int().min(MAIN_NUMBER_MIN).max(MAIN_NUMBER_MAX),
      value: z.number().nonnegative(),
    })
  ),
  additionalNumbers: z.array(
    z.object({
      number: z.number().int().min(EURO_NUMBER_MIN).max(EURO_NUMBER_MAX),
      value: z.number().nonnegative(),
    })
  ),
})

export type StatisticsData = z.infer<typeof statisticsDataSchema>
