import type {
  BatchSimulationResult,
  WinDistribution,
  SimulationStatistics,
  IndividualSimulationResult,
} from '~/types/batchSimulation'
import type { Ticket } from '~/types/ticket'
import type { EurojackpotHistoricOdds } from '~/types/winning'
import {
  calculateWinningLineCounts,
  combinationCount,
} from '~/utils/combinatorics'

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
  const expectedValue =
    totalSimulations > 0 ? totalWinnings / totalSimulations : 0

  const winDistribution = calculateWinDistribution(individualResults)
  const statistics = calculateSimulationStatistics(
    winnings,
    profits,
    totalSimulations > 0 ? totalCost / totalSimulations : 0
  )

  return {
    totalSimulations,
    totalCost,
    totalWinnings,
    netProfit,
    roiPercentage,
    expectedValue,
    winDistribution,
    statistics,
    individualResults,
  }
}

export function calculateWinDistribution(
  individualResults: IndividualSimulationResult[]
): WinDistribution {
  const winsByClass: Record<number, number> = {}
  for (let i = 1; i <= 12; i++) winsByClass[i] = 0

  let totalWins = 0

  for (const result of individualResults) {
    let hasWin = false
    for (const [classStr, count] of Object.entries(result.winsByClass)) {
      const cls = Number(classStr)
      if (count > 0) {
        winsByClass[cls] += count
        hasWin = true
      }
    }
    if (hasWin) totalWins++
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
  _costPerSimulation: number
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
    }
  }

  const sortedWinnings = [...winnings].sort((a, b) => a - b)
  const meanWinnings = winnings.reduce((sum, w) => sum + w, 0) / winnings.length

  const variance =
    winnings.reduce((sum, w) => sum + Math.pow(w - meanWinnings, 2), 0) /
    winnings.length
  const standardDeviation = Math.sqrt(variance)

  const medianWinnings = calculatePercentile(sortedWinnings, 50)
  const minWinnings = sortedWinnings[0]
  const maxWinnings = sortedWinnings[sortedWinnings.length - 1]
  const percentile25 = calculatePercentile(sortedWinnings, 25)
  const percentile75 = calculatePercentile(sortedWinnings, 75)
  const percentile95 = calculatePercentile(sortedWinnings, 95)

  const profitableSimulations = profits.filter((p) => p > 0).length
  const profitablePercentage =
    profits.length > 0 ? (profitableSimulations / profits.length) * 100 : 0

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
  }
}

export function calculatePercentile(
  sortedArray: number[],
  percentile: number
): number {
  if (sortedArray.length === 0) return 0
  if (percentile <= 0) return sortedArray[0]
  if (percentile >= 100) return sortedArray[sortedArray.length - 1]

  const index = (percentile / 100) * (sortedArray.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index % 1

  if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1]
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight
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
  oddsMap: Map<number, number>,
  costPerSimulation: number,
  simulationIndex: number
): IndividualSimulationResult {
  const mainSet = new Set(winningMainNumbers)
  const euroSet = new Set(winningEuroNumbers)

  let totalWinnings = 0
  const winsByClass: Record<number, number> = {}
  for (let i = 1; i <= 12; i++) winsByClass[i] = 0

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
        winsByClass[cls] = (winsByClass[cls] || 0) + count
        const amount = oddsMap.get(cls) ?? 0
        totalWinnings += amount * count
      }
    }
  }

  const netProfit = totalWinnings - costPerSimulation

  return {
    simulationIndex,
    winningNumbers: {
      mainNumbers: winningMainNumbers,
      euroNumbers: winningEuroNumbers,
    },
    totalWinnings: Number(totalWinnings.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
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

function getWinClassProbability(winClass: number): number {
  const probabilities: Record<number, number> = {
    1: 1 / 139838160,
    2: 1 / 6991908,
    3: 1 / 3107515,
    4: 1 / 621503,
    5: 1 / 31075,
    6: 1 / 14125,
    7: 1 / 13811,
    8: 1 / 985,
    9: 1 / 706,
    10: 1 / 314,
    11: 1 / 188,
    12: 1 / 49,
  }
  return probabilities[winClass] || 0
}
