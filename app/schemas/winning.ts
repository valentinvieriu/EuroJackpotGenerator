import { z } from 'zod'
import { WIN_CLASS_MIN, WIN_CLASS_MAX } from '~/utils/constants'

export const winningClassSchema = z.object({
  amount: z.number().nonnegative(),
  numberOfWins: z.number().int().nonnegative(),
  // Lotto Bayern quirk: winning classes 101-112 are normalized to 1-12
  winningClass: z.preprocess((val) => {
    if (typeof val === 'number' && val >= 101 && val <= 112) {
      return val - 100 // Normalize 101-112 to 1-12
    }
    return val
  }, z.number().int().min(WIN_CLASS_MIN).max(WIN_CLASS_MAX)),
  sequence: z.number().int().nonnegative(),
  jackpot: z.boolean(),
})

export const turnoverSchema = z.object({
  // Some Lotto Bayern payloads use -1 to denote unknown/NA turnover.
  // Clamp negatives to 0 during parsing so validation succeeds and we can use live odds.
  amount: z.preprocess(
    (val) => (typeof val === 'number' && val < 0 ? 0 : val),
    z.number().nonnegative()
  ),
  jurisdiction: z.number().int(),
})

export const eurojackpotHistoricOddsSchema = z.object({
  eurojackpotGameCycle: z.object({
    cycleNo: z.number().int(),
    cycleYear: z.number().int(),
    eventDate: z.number().int(),
    eventWeekday: z.number().int(),
    gametableValidFrom: z.number().int().nullable(),
    gametableValidTo: z.number().int().nullable(),
    key: z.string(),
    variantNo: z.number().int(),
  }),
  eurojackpotOdds: z.array(winningClassSchema),
  eurojackpotTurnover: z.array(turnoverSchema),
})

export type WinningClass = z.infer<typeof winningClassSchema>
export type Turnover = z.infer<typeof turnoverSchema>
export type EurojackpotHistoricOdds = z.infer<
  typeof eurojackpotHistoricOddsSchema
>
