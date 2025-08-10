import { describe, it, expect } from 'vitest'
import {
  calculateBatchStatistics,
  calculateWinDistribution,
  calculateSimulationStatistics,
  calculatePercentile,
  simulateSingleDraw,
  calculateTheoreticalExpectedValue,
} from '../batchStatistics'
import { combinationCount } from '../combinatorics'

describe('batchStatistics', () => {
  it('calculatePercentile on sorted data', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(calculatePercentile(arr, 0)).toBe(1)
    expect(calculatePercentile(arr, 50)).toBe(3)
    expect(calculatePercentile(arr, 100)).toBe(5)
  })

  it('calculateSimulationStatistics empty and non-empty', () => {
    const empty = calculateSimulationStatistics([], [], 0)
    expect(empty.meanWinnings).toBe(0)
    const stats = calculateSimulationStatistics([0, 10, 20], [-2, 1, 3], 2)
    expect(stats.medianWinnings).toBe(10)
    expect(stats.maxWinnings).toBe(20)
    expect(stats.profitableSimulations).toBe(2)
  })

  it('simulateSingleDraw computes correct wins and payouts', () => {
    const tickets = [
      { id: 1, mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] },
    ] as any
    const winningMain = [1, 2, 3, 4, 5]
    const winningEuro = [1, 2]
    const oddsMap = new Map<number, number>([[1, 1000]]) // class 1 payout
    const linesCost = combinationCount(5, 2) * 2
    const result = simulateSingleDraw(
      tickets,
      winningMain,
      winningEuro,
      oddsMap,
      linesCost,
      0
    )
    expect(result.winsByClass[1]).toBe(1)
    expect(result.totalWinnings).toBe(1000)
    expect(result.netProfit).toBe(1000 - linesCost)
  })

  it('calculateBatchStatistics aggregates totals', () => {
    const individual = [
      {
        simulationIndex: 0,
        winningNumbers: { mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] },
        totalWinnings: 10,
        netProfit: -2,
        winsByClass: { 12: 1 },
      },
      {
        simulationIndex: 1,
        winningNumbers: { mainNumbers: [6, 7, 8, 9, 10], euroNumbers: [3, 4] },
        totalWinnings: 0,
        netProfit: -2,
        winsByClass: {},
      },
    ] as any
    const totalCost = 4
    const res = calculateBatchStatistics(individual, totalCost)
    expect(res.totalSimulations).toBe(2)
    expect(res.totalWinnings).toBe(10)
    expect(res.netProfit).toBe(6)
    expect(res.roiPercentage).toBe((6 / 4) * 100)
  })

  it('calculateWinDistribution counts winning simulations', () => {
    const dist = calculateWinDistribution([
      {
        winsByClass: { 12: 1 },
        simulationIndex: 0,
        winningNumbers: { mainNumbers: [], euroNumbers: [] },
        totalWinnings: 1,
        netProfit: -1,
      },
      {
        winsByClass: { 12: 0 },
        simulationIndex: 1,
        winningNumbers: { mainNumbers: [], euroNumbers: [] },
        totalWinnings: 0,
        netProfit: -1,
      },
    ] as any)
    expect(dist.totalWins).toBe(1)
    expect(dist.totalLosses).toBe(1)
    expect(dist.winsByClass[12]).toBe(1)
  })

  it('calculateTheoreticalExpectedValue sums probabilities * amount * lines', () => {
    const data = {
      eurojackpotGameCycle: {
        cycleNo: 1,
        cycleYear: 2025,
        eventDate: Date.now(),
        eventWeekday: 5,
        gametableValidFrom: null,
        gametableValidTo: null,
        key: 'x',
        variantNo: 1,
      },
      eurojackpotOdds: [
        {
          amount: 1000,
          numberOfWins: 0,
          winningClass: 12,
          sequence: 12,
          jackpot: false,
        },
      ],
      eurojackpotTurnover: [{ amount: 0, jurisdiction: 0 }],
    }
    const ev = calculateTheoreticalExpectedValue(2, 5, 2, data as any)
    // lines per ticket = 1 -> total lines = 2; probability for class 12 = 1/49
    expect(ev).toBeCloseTo((1 / 49) * 1000 * 2, 6)
  })
})
