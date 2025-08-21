import type {
  BatchSimulationResult,
  WinDistribution,
  SimulationStatistics,
  IndividualSimulationResult,
  Ticket,
  EurojackpotHistoricOdds,
} from '~/schemas'
import {
  calculateWinningLineCounts,
  combinationCount,
} from '~/utils/combinatorics'
import { getWinClassProbability } from '~/utils/winProbabilities'

/**
 * Sanitizes numbers to avoid Infinity/NaN in JSON serialization
 * Also sanitizes impossible percentages (>100%) to null
 */
const finiteOrNull = (n: number): number | null =>
  Number.isFinite(n) ? n : null

const finitePercentageOrNull = (n: number): number | null =>
  Number.isFinite(n) && n >= 0 && n <= 100 ? n : null

/**
 * Clamps tiny values to zero to prevent "-0.00" display noise
 */
export const clampTiny = (n: number, eps = 1e-10): number =>
  Math.abs(n) < eps ? 0 : n

/**
 * Type-safe win class key for better compiler checking
 */
type WinClassKey = `${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`
type WinClassMap = Record<WinClassKey, number>

export function calculateBatchStatistics(
  individualResults: IndividualSimulationResult[],
  totalCost: number
): BatchSimulationResult {
  const totalSimulations = individualResults.length
  const winnings = individualResults.map((r) => r.totalWinnings)
  const profits = individualResults.map((r) => r.netProfit)

  const totalWinnings = winnings.reduce((sum, w) => sum + w, 0)
  const netProfit = totalWinnings - totalCost
  const roiPercentage = totalCost > 0 ? (netProfit / totalCost) * 100 : 0

  // Enhanced metrics for better user understanding
  const averageWinningsPerSimulation =
    totalSimulations > 0 ? totalWinnings / totalSimulations : 0
  const expectedNetReturn =
    totalSimulations > 0 ? netProfit / totalSimulations : 0
  const returnRatePerEuro = totalCost > 0 ? totalWinnings / totalCost : 0

  const winDistribution = calculateWinDistribution(individualResults)
  const costPerPlay = totalSimulations > 0 ? totalCost / totalSimulations : 0

  // 1) Core Economics (per play)
  const stakePerPlay = costPerPlay
  const expectedPayoutPerPlay = averageWinningsPerSimulation // E[payout]
  const expectedProfitPerPlay = expectedNetReturn // EV = E[payout] - stake
  const returnToPlayer =
    stakePerPlay > 0 ? expectedPayoutPerPlay / stakePerPlay : 0 // RTP
  const houseEdge = stakePerPlay > 0 ? 1 - returnToPlayer : 0 // 1 - RTP
  const expectedLossPerEuro = stakePerPlay > 0 ? houseEdge : 0 // Same as house edge

  // 2) Hit Quality (separate "any prize" from "profitable")
  const hitRate = winDistribution.winPercentage // Any prize > €0
  const profitableSimulations = individualResults.filter(
    (r) => r.netProfit >= 0
  ).length
  const profitRate =
    totalSimulations > 0 ? (profitableSimulations / totalSimulations) * 100 : 0
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

  // Fix: Calculate actual average loss for losing simulations
  const losingSimulations = individualResults.filter(
    (r) => r.totalWinnings < costPerPlay
  )
  const averageLossPerLosingSimulation = losingSimulations.length
    ? losingSimulations.reduce(
        (sum, r) => sum + (costPerPlay - r.totalWinnings),
        0
      ) / losingSimulations.length
    : 0

  const statistics = calculateSimulationStatistics(
    winnings,
    profits,
    costPerPlay
  )

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
    individualResults,
  }
}

export function calculateWinDistribution(
  individualResults: IndividualSimulationResult[]
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

  let totalWins = 0

  for (const result of individualResults) {
    for (const [classStr, count] of Object.entries(result.winsByClass)) {
      if (count > 0) {
        const key = classStr as WinClassKey
        winsByClass[key] = (winsByClass[key] ?? 0) + count
      }
    }
    // Count a "hit" only if the simulation actually paid > €0
    if (result.totalWinnings > 0) totalWins++
  }

  const totalLosses = individualResults.length - totalWins
  const winPercentage =
    individualResults.length > 0
      ? (totalWins / individualResults.length) * 100
      : 0

  return { winsByClass, totalWins, totalLosses, winPercentage }
}

export function calculateSimulationStatistics(
  winnings: number[],
  profits: number[],
  _costPerPlay: number
): SimulationStatistics {
  if (winnings.length === 0) {
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

  const sortedWinnings = [...winnings].sort((a, b) => a - b)
  const meanWinnings = winnings.reduce((sum, w) => sum + w, 0) / winnings.length

  // Use sample variance (N-1) to describe spread of outcomes
  const variance =
    winnings.length > 1
      ? winnings.reduce((sum, w) => sum + Math.pow(w - meanWinnings, 2), 0) /
        (winnings.length - 1)
      : 0
  const standardDeviation = Math.sqrt(variance)

  const medianWinnings = calculatePercentile(sortedWinnings, 50) ?? 0
  const minWinnings = sortedWinnings[0] ?? 0
  const maxWinnings = sortedWinnings[sortedWinnings.length - 1] ?? 0
  const percentile25 = calculatePercentile(sortedWinnings, 25) ?? 0
  const percentile75 = calculatePercentile(sortedWinnings, 75) ?? 0
  const percentile95 = calculatePercentile(sortedWinnings, 95) ?? 0

  const profitableSimulations = profits.filter((p) => p >= 0).length
  const profitablePercentage =
    profits.length > 0 ? (profitableSimulations / profits.length) * 100 : 0

  // Calculate profit distribution percentiles
  const sortedProfits = [...profits].sort((a, b) => a - b)
  const medianProfit = calculatePercentile(sortedProfits, 50) ?? 0
  const percentileNet5 = calculatePercentile(sortedProfits, 5) ?? 0
  const percentileNet50 = medianProfit
  const percentileNet95 = calculatePercentile(sortedProfits, 95) ?? 0

  // Calculate ROI percentiles
  const rois =
    _costPerPlay > 0
      ? profits.map((p) => (p / _costPerPlay) * 100)
      : profits.map(() => 0)
  const medianRoiPct = rois.length
    ? (calculatePercentile(
        [...rois].sort((a, b) => a - b),
        50
      ) ?? 0)
    : 0

  return {
    meanWinnings,
    medianWinnings,
    standardDeviation,
    minWinnings,
    maxWinnings,
    percentile25,
    percentile75,
    percentile95,
    profitableSimulations,
    profitablePercentage,
    // Net/profit distribution percentiles
    medianProfit,
    percentileNet5,
    percentileNet50,
    percentileNet95,
    medianRoiPct,
  }
}

export function calculatePercentile(
  sortedArray: number[],
  percentile: number
): number {
  if (sortedArray.length === 0) return 0
  if (percentile <= 0) return sortedArray[0] ?? 0
  if (percentile >= 100) return sortedArray[sortedArray.length - 1] ?? 0

  const index = (percentile / 100) * (sortedArray.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index % 1

  if (upper >= sortedArray.length)
    return sortedArray[sortedArray.length - 1] ?? 0
  const lowerValue = sortedArray[lower] ?? 0
  const upperValue = sortedArray[upper] ?? 0
  return lowerValue * (1 - weight) + upperValue * weight
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

/**
 * Theoretical EV for the given ticket configuration and odds.
 * Uses public EuroJackpot class probabilities.
 */
export function calculateTheoreticalExpectedValue(
  ticketCount: number,
  systemMain: number,
  systemEuro: number,
  winningData: EurojackpotHistoricOdds
): number {
  if (!winningData?.eurojackpotOdds?.length) return 0

  const linesPerTicket = combinationCount(systemMain, systemEuro)
  const totalLines = ticketCount * linesPerTicket

  let expectedValue = 0
  for (const odd of winningData.eurojackpotOdds) {
    if (odd.winningClass >= 1 && odd.winningClass <= 12 && odd.amount > 0) {
      const probability = getWinClassProbability(odd.winningClass)
      if (probability > 0) {
        expectedValue += probability * odd.amount * totalLines
      }
    }
  }
  return expectedValue
}
