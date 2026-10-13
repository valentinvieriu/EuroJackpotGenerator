import type {
  BatchSimulationResult,
  WinDistribution,
  SimulationStatistics,
  IndividualSimulationResult,
  Ticket,
} from '~/schemas'
import { calculateWinningLineCounts } from '~/utils/combinatorics'

/**
 * Sanitizes numbers to avoid Infinity/NaN in JSON serialization
 * Also sanitizes impossible percentages (>100%) to null
 */
const finiteOrNull = (n: number): number | null =>
  Number.isFinite(n) ? n : null

const finitePercentageOrNull = (n: number): number | null =>
  Number.isFinite(n) && n >= 0 && n <= 100 ? n : null

/**
 * Type-safe win class key for better compiler checking
 */
type WinClassKey = `${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`
type WinClassMap = Record<WinClassKey, number>

/**
 * A run reduced to the running totals the statistics are built from. Nothing
 * here grows with the number of draws, only with how many different amounts
 * a draw has paid.
 */
export interface RunTotals {
  /** Draws played */
  draws: number
  /** Stake for one draw across all tickets, in euros */
  stakePerDraw: number
  /** How many draws paid each amount, keyed by the payout in cents. Draws that paid nothing are left out. */
  payoutCounts: ReadonlyMap<number, number>
  /** Winning lines per win class across the whole run */
  winsByClass: Readonly<Record<number, number>>
}

/** One payout amount in cents and the number of draws that paid it */
type PayoutCount = readonly [cents: number, draws: number]

/** Every draw of the run as ascending payout amounts, the unpaid draws included */
function sortedPayoutCounts(totals: RunTotals): PayoutCount[] {
  const paid = [...totals.payoutCounts]
    .filter(([cents, draws]) => cents > 0 && draws > 0)
    .sort((a, b) => a[0] - b[0])
  const paidDraws = paid.reduce((sum, [, draws]) => sum + draws, 0)
  const unpaidDraws = totals.draws - paidDraws
  return unpaidDraws > 0 ? [[0, unpaidDraws], ...paid] : paid
}

export function calculateBatchStatistics(
  totals: RunTotals
): BatchSimulationResult {
  const totalSimulations = totals.draws
  const stakePerPlay = totals.stakePerDraw
  const totalCost = stakePerPlay * totalSimulations
  const payouts = sortedPayoutCounts(totals)

  // Sum in cents to avoid float drift
  const totalWinnings =
    payouts.reduce((sum, [cents, draws]) => sum + cents * draws, 0) / 100
  const netProfit = totalWinnings - totalCost
  const roiPercentage = totalCost > 0 ? (netProfit / totalCost) * 100 : 0

  // Enhanced metrics for better user understanding
  const averageWinningsPerSimulation =
    totalSimulations > 0 ? totalWinnings / totalSimulations : 0
  const expectedNetReturn =
    totalSimulations > 0 ? netProfit / totalSimulations : 0
  const returnRatePerEuro = totalCost > 0 ? totalWinnings / totalCost : 0

  const winDistribution = calculateWinDistribution(totals, payouts)

  // 1) Core Economics (per play)
  const expectedPayoutPerPlay = averageWinningsPerSimulation // E[payout]
  const expectedProfitPerPlay = expectedNetReturn // EV = E[payout] - stake
  const returnToPlayer =
    stakePerPlay > 0 ? expectedPayoutPerPlay / stakePerPlay : 0 // RTP
  const houseEdge = stakePerPlay > 0 ? 1 - returnToPlayer : 0 // 1 - RTP
  const expectedLossPerEuro = stakePerPlay > 0 ? houseEdge : 0 // Same as house edge

  const statistics = calculateSimulationStatistics(
    payouts,
    totalSimulations,
    stakePerPlay
  )

  // 2) Hit Quality (separate "any prize" from "profitable")
  const hitRate = winDistribution.winPercentage // Any prize > €0
  const profitRate = statistics.profitablePercentage
  const averagePayoutWhenHit =
    winDistribution.totalWins > 0
      ? totalWinnings / winDistribution.totalWins
      : 0
  const averageNetWhenHit = averagePayoutWhenHit - stakePerPlay
  const expectedPlaysPerHit = hitRate > 0 ? 100 / hitRate : Infinity

  // 3) Why Win Rate ≠ Profit - Break-even diagnostics
  const neededAveragePayoutToBreakEven = stakePerPlay // Need to win stake back
  const payoutShortfall = neededAveragePayoutToBreakEven - expectedPayoutPerPlay

  // Real break-even diagnostics (replace the tautological "100% RTP")
  const payoutMultiplierNeeded =
    expectedPayoutPerPlay > 0 ? stakePerPlay / expectedPayoutPerPlay : Infinity

  const hitRateDecimal = hitRate / 100 // Convert percentage to decimal
  const breakEvenHitRateAtCurrentPrize =
    averagePayoutWhenHit > 0
      ? (stakePerPlay / averagePayoutWhenHit) * 100 // Return as percentage
      : Infinity

  const breakEvenAvgPrizeAtCurrentHitRate =
    hitRateDecimal > 0 ? stakePerPlay / hitRateDecimal : Infinity

  const netIfEveryPlayHit = averagePayoutWhenHit - stakePerPlay // Net if 100% hit rate

  // Legacy calculations for backward compatibility
  const averagePrizePerWin = averagePayoutWhenHit

  // Average shortfall across the draws that paid back less than the stake
  let losingSimulations = 0
  let lossTotal = 0
  for (const [cents, draws] of payouts) {
    const payout = cents / 100
    if (payout < stakePerPlay) {
      losingSimulations += draws
      lossTotal += (stakePerPlay - payout) * draws
    }
  }
  const averageLossPerLosingSimulation = losingSimulations
    ? lossTotal / losingSimulations
    : 0

  return {
    totalSimulations,
    totalCost,
    totalWinnings,
    netProfit,
    roiPercentage,
    // Core Economics (per play)
    stakePerPlay,
    expectedPayoutPerPlay,
    expectedProfitPerPlay,
    returnToPlayer,
    houseEdge,
    expectedLossPerEuro,
    // Hit Quality
    hitRate,
    profitRate,
    averagePayoutWhenHit,
    averageNetWhenHit,
    expectedPlaysPerHit: finiteOrNull(expectedPlaysPerHit),
    // Why Win Rate ≠ Profit - Break-even diagnostics
    neededAveragePayoutToBreakEven,
    payoutShortfall,
    payoutMultiplierNeeded: finiteOrNull(payoutMultiplierNeeded),
    breakEvenHitRateAtCurrentPrize: finitePercentageOrNull(
      breakEvenHitRateAtCurrentPrize
    ),
    breakEvenAvgPrizeAtCurrentHitRate: finiteOrNull(
      breakEvenAvgPrizeAtCurrentHitRate
    ),
    netIfEveryPlayHit,
    // Legacy fields for backward compatibility
    averageWinningsPerSimulation,
    expectedNetReturn,
    returnRatePerEuro,
    averagePrizePerWin,
    averageLossPerLosingSimulation,
    winDistribution,
    statistics,
  }
}

function calculateWinDistribution(
  totals: RunTotals,
  payouts: ReadonlyArray<PayoutCount>
): WinDistribution {
  const winsByClass: WinClassMap = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
    '6': 0,
    '7': 0,
    '8': 0,
    '9': 0,
    '10': 0,
    '11': 0,
    '12': 0,
  }
  for (const key of Object.keys(winsByClass) as WinClassKey[]) {
    winsByClass[key] = totals.winsByClass[Number(key)] ?? 0
  }

  // Count a "hit" only if the draw actually paid > €0
  const totalWins = payouts.reduce(
    (sum, [cents, draws]) => (cents > 0 ? sum + draws : sum),
    0
  )
  const totalLosses = totals.draws - totalWins
  const winPercentage = totals.draws > 0 ? (totalWins / totals.draws) * 100 : 0

  return { winsByClass, totalWins, totalLosses, winPercentage }
}

function calculateSimulationStatistics(
  payouts: ReadonlyArray<PayoutCount>,
  draws: number,
  stakePerDraw: number
): SimulationStatistics {
  if (draws === 0) {
    return {
      meanWinnings: 0,
      medianWinnings: 0,
      standardDeviation: 0,
      minWinnings: 0,
      maxWinnings: 0,
      percentile25: 0,
      percentile75: 0,
      percentile95: 0,
      profitableSimulations: 0,
      profitablePercentage: 0,
      // Net/profit distribution percentiles
      medianProfit: 0,
      percentileNet5: 0,
      percentileNet50: 0,
      percentileNet95: 0,
      medianRoiPct: 0,
    }
  }

  const percentile = (p: number) => percentileOfCounts(payouts, p) / 100

  const meanWinnings =
    payouts.reduce((sum, [cents, n]) => sum + cents * n, 0) / 100 / draws

  // Use sample variance (N-1) to describe spread of outcomes
  const variance =
    draws > 1
      ? payouts.reduce(
          (sum, [cents, n]) =>
            sum + Math.pow(cents / 100 - meanWinnings, 2) * n,
          0
        ) /
        (draws - 1)
      : 0
  const standardDeviation = Math.sqrt(variance)

  const medianWinnings = percentile(50)
  const minWinnings = (payouts[0]?.[0] ?? 0) / 100
  const maxWinnings = (payouts[payouts.length - 1]?.[0] ?? 0) / 100

  const profitableSimulations = payouts.reduce(
    (sum, [cents, n]) => (cents / 100 >= stakePerDraw ? sum + n : sum),
    0
  )
  const profitablePercentage = (profitableSimulations / draws) * 100

  // Every draw costs the same stake, so the profit distribution is the
  // payout distribution shifted down by it
  const medianProfit = medianWinnings - stakePerDraw
  const medianRoiPct =
    stakePerDraw > 0 ? (medianProfit / stakePerDraw) * 100 : 0

  return {
    meanWinnings,
    medianWinnings,
    standardDeviation,
    minWinnings,
    maxWinnings,
    percentile25: percentile(25),
    percentile75: percentile(75),
    percentile95: percentile(95),
    profitableSimulations,
    profitablePercentage,
    // Net/profit distribution percentiles
    medianProfit,
    percentileNet5: percentile(5) - stakePerDraw,
    percentileNet50: medianProfit,
    percentileNet95: percentile(95) - stakePerDraw,
    medianRoiPct,
  }
}

/**
 * Percentile of a distribution given as ascending [value, count] pairs,
 * interpolating linearly between neighbouring ranks. Gives the same answer as
 * sorting every single value, without holding them.
 */
export function percentileOfCounts(
  sortedCounts: ReadonlyArray<readonly [value: number, count: number]>,
  percentile: number
): number {
  const total = sortedCounts.reduce((sum, [, count]) => sum + count, 0)
  if (total === 0) return 0

  const valueAtRank = (rank: number): number => {
    let seen = 0
    for (const [value, count] of sortedCounts) {
      seen += count
      if (rank < seen) return value
    }
    return sortedCounts[sortedCounts.length - 1]?.[0] ?? 0
  }

  const index = (Math.min(100, Math.max(0, percentile)) / 100) * (total - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower
  return valueAtRank(lower) * (1 - weight) + valueAtRank(upper) * weight
}

/**
 * Optimized simulation of a single draw:
 * - Avoids cloning tickets
 * - Computes class counts and payouts directly using a payout map
 */
export function simulateSingleDraw(
  tickets: Ticket[],
  winningMainNumbers: number[],
  winningEuroNumbers: number[],
  payoutMap: Map<number, number>,
  costPerSimulation: number,
  simulationIndex: number
): IndividualSimulationResult {
  const mainSet = new Set(winningMainNumbers)
  const euroSet = new Set(winningEuroNumbers)

  // Use cents internally to avoid float drift
  let totalWinningsCents = 0
  const winsByClass: Record<string, number> = {}
  for (let i = 1; i <= 12; i++) winsByClass[String(i)] = 0

  for (const ticket of tickets) {
    const k = ticket.mainNumbers.reduce(
      (acc, n) => acc + (mainSet.has(n) ? 1 : 0),
      0
    )
    const h = ticket.euroNumbers.reduce(
      (acc, n) => acc + (euroSet.has(n) ? 1 : 0),
      0
    )
    const m = ticket.mainNumbers.length
    const e = ticket.euroNumbers.length

    const winCounts = calculateWinningLineCounts(m, e, k, h)
    for (const [classStr, count] of Object.entries(winCounts)) {
      const cls = Number(classStr)
      if (count > 0) {
        const clsKey = String(cls)
        winsByClass[clsKey] = (winsByClass[clsKey] ?? 0) + count
        const amountEuros = payoutMap.get(cls) ?? 0
        const amountCents = Math.round(amountEuros * 100)
        totalWinningsCents += amountCents * count
      }
    }
  }

  // Convert back to euros at the end
  const totalWinnings = totalWinningsCents / 100
  const netProfit = totalWinnings - costPerSimulation

  return {
    simulationIndex,
    winningNumbers: {
      mainNumbers: winningMainNumbers,
      euroNumbers: winningEuroNumbers,
    },
    // avoid per-draw rounding; round only at presentation
    totalWinnings,
    netProfit,
    winsByClass,
  }
}
