// utils/batchStatistics.ts

import type {
  BatchSimulationResult,
  WinDistribution,
  SimulationStatistics,
  IndividualSimulationResult,
} from '~/types/batchSimulation'
import type { Ticket } from '~/types/ticket'
import type { EurojackpotHistoricOdds } from '~/types/winning'
import { calculateTotalWinnings } from '~/utils/winningManager'
import { calculateWinningLineCounts } from '~/utils/combinatorics'

/**
 * Calculates comprehensive statistics from batch simulation results.
 *
 * @param individualResults Array of individual simulation results
 * @param totalCost Total cost of tickets across all simulations
 * @returns Comprehensive batch simulation statistics
 */
export function calculateBatchStatistics(
  individualResults: IndividualSimulationResult[],
  totalCost: number
): BatchSimulationResult {
  const totalSimulations = individualResults.length
  const winnings = individualResults.map((r) => r.totalWinnings)
  const profits = individualResults.map((r) => r.netProfit)

  // Calculate basic totals
  const totalWinnings = winnings.reduce((sum, w) => sum + w, 0)
  const netProfit = totalWinnings - totalCost
  const roiPercentage = totalCost > 0 ? (netProfit / totalCost) * 100 : 0
  const expectedValue = totalWinnings / totalSimulations

  // Calculate win distribution
  const winDistribution = calculateWinDistribution(individualResults)

  // Calculate detailed statistics
  const statistics = calculateSimulationStatistics(
    winnings,
    profits,
    totalCost / totalSimulations
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

/**
 * Calculates win distribution statistics across all simulations.
 */
export function calculateWinDistribution(
  individualResults: IndividualSimulationResult[]
): WinDistribution {
  const winsByClass: Record<number, number> = {}
  let totalWins = 0

  // Initialize all classes to 0
  for (let i = 1; i <= 12; i++) {
    winsByClass[i] = 0
  }

  // Count wins by class
  individualResults.forEach((result) => {
    let hasWin = false
    Object.entries(result.winsByClass).forEach(([classStr, count]) => {
      const cls = Number(classStr)
      if (count > 0) {
        winsByClass[cls] += count
        hasWin = true
      }
    })
    if (hasWin) totalWins++
  })

  const totalLosses = individualResults.length - totalWins
  const winPercentage =
    individualResults.length > 0
      ? (totalWins / individualResults.length) * 100
      : 0

  return {
    winsByClass,
    totalWins,
    totalLosses,
    winPercentage,
  }
}

/**
 * Calculates detailed statistical measures from simulation results.
 */
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

  // Sort arrays for percentile calculations
  const sortedWinnings = [...winnings].sort((a, b) => a - b)

  // Basic statistics
  const meanWinnings = winnings.reduce((sum, w) => sum + w, 0) / winnings.length
  const medianWinnings = calculatePercentile(sortedWinnings, 50)

  // Standard deviation
  const variance =
    winnings.reduce((sum, w) => sum + Math.pow(w - meanWinnings, 2), 0) /
    winnings.length
  const standardDeviation = Math.sqrt(variance)

  // Min/Max
  const minWinnings = Math.min(...winnings)
  const maxWinnings = Math.max(...winnings)

  // Percentiles
  const percentile25 = calculatePercentile(sortedWinnings, 25)
  const percentile75 = calculatePercentile(sortedWinnings, 75)
  const percentile95 = calculatePercentile(sortedWinnings, 95)

  // Profitability statistics
  const profitableSimulations = profits.filter((p) => p > 0).length
  const profitablePercentage = (profitableSimulations / profits.length) * 100

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

/**
 * Calculates the nth percentile of a sorted array.
 */
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

  if (upper >= sortedArray.length) {
    return sortedArray[sortedArray.length - 1]
  }

  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight
}

/**
 * Simulates a single draw against a set of tickets and calculates results.
 */
export function simulateSingleDraw(
  tickets: Ticket[],
  winningMainNumbers: number[],
  winningEuroNumbers: number[],
  winningData: EurojackpotHistoricOdds,
  costPerSimulation: number,
  simulationIndex: number
): IndividualSimulationResult {
  // Create copies of tickets to avoid modifying originals
  const ticketCopies = tickets.map((ticket) => ({
    ...ticket,
    winningMainNumbers: undefined,
    winningEuroNumbers: undefined,
    winClassCounts: undefined,
    winClass: undefined,
  }))

  // Calculate wins for each ticket
  ticketCopies.forEach((ticket) => {
    // Calculate matches
    ticket.winningMainNumbers = ticket.mainNumbers.filter((n) =>
      winningMainNumbers.includes(n)
    )
    ticket.winningEuroNumbers = ticket.euroNumbers.filter((n) =>
      winningEuroNumbers.includes(n)
    )

    // Calculate winning class counts using combinatorial math
    const k = ticket.winningMainNumbers.length
    const h = ticket.winningEuroNumbers.length
    const m = ticket.mainNumbers.length
    const e = ticket.euroNumbers.length

    const winCounts = calculateWinningLineCounts(m, e, k, h)
    ticket.winClassCounts = winCounts
    ticket.winClass = Object.keys(winCounts)
      .map(Number)
      .sort((a, b) => a - b)[0] // Best class if any
  })

  // Calculate total winnings
  const totalWinnings = calculateTotalWinnings(ticketCopies, winningData)
  const netProfit = totalWinnings - costPerSimulation

  // Aggregate wins by class
  const winsByClass: Record<number, number> = {}
  for (let i = 1; i <= 12; i++) {
    winsByClass[i] = 0
  }

  ticketCopies.forEach((ticket) => {
    if (ticket.winClassCounts) {
      Object.entries(ticket.winClassCounts).forEach(([classStr, count]) => {
        const cls = Number(classStr)
        winsByClass[cls] = (winsByClass[cls] || 0) + count
      })
    }
  })

  return {
    simulationIndex,
    winningNumbers: {
      mainNumbers: winningMainNumbers,
      euroNumbers: winningEuroNumbers,
    },
    totalWinnings,
    netProfit,
    winsByClass,
  }
}

/**
 * Calculates theoretical expected value based on odds and probabilities.
 * This provides a mathematical baseline for comparison with simulation results.
 */
export function calculateTheoreticalExpectedValue(
  ticketCount: number,
  systemMain: number,
  systemEuro: number,
  winningData: EurojackpotHistoricOdds
): number {
  if (!winningData?.eurojackpotOdds?.length) return 0

  // Calculate total number of lines per ticket
  const linesPerTicket = combinationCount(systemMain, systemEuro)
  const totalLines = ticketCount * linesPerTicket

  let expectedValue = 0

  // For each winning class, calculate probability and expected payout
  winningData.eurojackpotOdds.forEach((odd) => {
    if (odd.winningClass >= 1 && odd.winningClass <= 12 && odd.amount > 0) {
      // Get probability for this winning class
      const probability = getWinClassProbability(odd.winningClass)
      if (probability > 0) {
        expectedValue += probability * odd.amount * totalLines
      }
    }
  })

  return expectedValue
}

/**
 * Returns the theoretical probability of winning each class.
 * Based on EuroJackpot official probabilities.
 */
function getWinClassProbability(winClass: number): number {
  const probabilities: Record<number, number> = {
    1: 1 / 139838160, // 5+2 (Jackpot)
    2: 1 / 6991908, // 5+1
    3: 1 / 3107515, // 5+0
    4: 1 / 621503, // 4+2
    5: 1 / 31075, // 4+1
    6: 1 / 14125, // 3+2
    7: 1 / 13811, // 4+0
    8: 1 / 985, // 2+2
    9: 1 / 706, // 3+1
    10: 1 / 314, // 3+0
    11: 1 / 188, // 1+2
    12: 1 / 49, // 2+1
  }

  return probabilities[winClass] || 0
}

/**
 * Helper function to calculate combination count (from combinatorics.ts)
 */
function combinationCount(m: number, e: number): number {
  const C = (n: number, r: number): number => {
    if (r < 0 || r > n) return 0
    return [...Array(r)].reduce((p, _, i) => (p * (n - i)) / (i + 1), 1)
  }
  return C(m, 5) * C(e, 2)
}
