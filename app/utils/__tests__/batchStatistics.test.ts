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
    const payoutMap = new Map<number, number>([[1, 1000]]) // class 1 payout
    const linesCost = combinationCount(5, 2) * 2
    const result = simulateSingleDraw(
      tickets,
      winningMain,
      winningEuro,
      payoutMap,
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

  it('calculateBatchStatistics computes enhanced metrics correctly', () => {
    const individual = [
      {
        simulationIndex: 0,
        winningNumbers: { mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] },
        totalWinnings: 20,
        netProfit: 8, // cost per sim = 12
        winsByClass: { 11: 1 },
      },
      {
        simulationIndex: 1,
        winningNumbers: { mainNumbers: [6, 7, 8, 9, 10], euroNumbers: [3, 4] },
        totalWinnings: 0,
        netProfit: -12,
        winsByClass: {},
      },
    ] as any
    const totalCost = 24 // 2 simulations * 12 cost each
    const res = calculateBatchStatistics(individual, totalCost)

    // Basic metrics
    expect(res.totalSimulations).toBe(2)
    expect(res.totalWinnings).toBe(20)
    expect(res.netProfit).toBe(-4) // 20 - 24

    // Core Economics (per play)
    expect(res.stakePerPlay).toBe(12) // 24 / 2
    expect(res.expectedPayoutPerPlay).toBe(10) // 20 / 2
    expect(res.expectedProfitPerPlay).toBe(-2) // -4 / 2
    expect(res.returnToPlayer).toBe(10 / 12) // ~0.833
    expect(res.houseEdge).toBe(1 - 10 / 12) // ~0.167
    expect(res.expectedLossPerEuro).toBe(1 - 10 / 12) // Same as house edge

    // Hit Quality
    expect(res.hitRate).toBe(50) // 1 win out of 2 simulations
    expect(res.profitRate).toBe(50) // 1 profitable simulation (20 >= 12)
    expect(res.averagePayoutWhenHit).toBe(20) // 20 winnings / 1 win
    expect(res.averageNetWhenHit).toBe(8) // 20 - 12

    // Why Win Rate ≠ Profit
    expect(res.neededAveragePayoutToBreakEven).toBe(12)
    expect(res.payoutShortfall).toBe(2)
    // New break-even diagnostics
    expect(res.payoutMultiplierNeeded).toBe(1.2) // 12/10 = 1.2x needed
    expect(res.breakEvenHitRateAtCurrentPrize).toBe(60) // (12/20)*100 = 60% hit rate needed
    expect(res.breakEvenAvgPrizeAtCurrentHitRate).toBe(24) // 12/(50/100) = €24 avg prize needed
    expect(res.expectedPlaysPerHit).toBe(2) // 100/50 = 2 plays per hit
    expect(res.netIfEveryPlayHit).toBe(8) // 20 - 12 (loss even at 100% hit rate)

    // Legacy/derived metrics
    expect(res.averageWinningsPerSimulation).toBe(10) // 20 / 2
    expect(res.expectedNetReturn).toBe(-2) // -4 / 2
    expect(res.returnRatePerEuro).toBe(20 / 24) // ~0.833
    expect(res.averagePrizePerWin).toBe(20) // 20 winnings / 1 win = 20
    expect(res.averageLossPerLosingSimulation).toBe(12) // actual loss for the losing simulation
  })

  it('calculateBatchStatistics handles all-losing scenario', () => {
    const individual = [
      {
        simulationIndex: 0,
        winningNumbers: { mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] },
        totalWinnings: 0,
        netProfit: -10,
        winsByClass: {},
      },
      {
        simulationIndex: 1,
        winningNumbers: { mainNumbers: [6, 7, 8, 9, 10], euroNumbers: [3, 4] },
        totalWinnings: 0,
        netProfit: -10,
        winsByClass: {},
      },
    ] as any
    const totalCost = 20
    const res = calculateBatchStatistics(individual, totalCost)

    // Core Economics (per play) - all-losing scenario
    expect(res.stakePerPlay).toBe(10) // 20 / 2
    expect(res.expectedPayoutPerPlay).toBe(0) // No winnings
    expect(res.expectedProfitPerPlay).toBe(-10) // Full loss
    expect(res.returnToPlayer).toBe(0) // 0% RTP
    expect(res.houseEdge).toBe(1) // 100% house edge
    expect(res.expectedLossPerEuro).toBe(1) // Lose full euro

    // Hit Quality - no hits, no profits
    expect(res.hitRate).toBe(0) // 0% hit rate
    expect(res.profitRate).toBe(0) // 0% profit rate
    expect(res.averagePayoutWhenHit).toBe(0) // No wins, so no average payout
    expect(res.averageNetWhenHit).toBe(-10) // 0 payout - 10 stake

    // Why Win Rate ≠ Profit
    expect(res.neededAveragePayoutToBreakEven).toBe(10) // Need €10 to break even
    expect(res.payoutShortfall).toBe(10) // Full shortfall (10 - 0)
    // New break-even diagnostics - all-losing scenario (now nullable)
    expect(res.payoutMultiplierNeeded).toBe(null) // Infinity sanitized to null
    expect(res.breakEvenHitRateAtCurrentPrize).toBe(null) // Infinity sanitized to null
    expect(res.breakEvenAvgPrizeAtCurrentHitRate).toBe(null) // Infinity sanitized to null
    expect(res.netIfEveryPlayHit).toBe(-10) // Even if every play hit with €0, still lose €10 stake
    expect(res.expectedPlaysPerHit).toBe(null) // Infinity sanitized to null (0% hit rate)

    // Legacy metrics
    expect(res.averageWinningsPerSimulation).toBe(0)
    expect(res.expectedNetReturn).toBe(-10)
    expect(res.returnRatePerEuro).toBe(0)
    expect(res.averagePrizePerWin).toBe(0) // No wins, so no average prize
    // removed: worstCaseScenario
  })

  it('calculateBatchStatistics handles edge case: zero cost', () => {
    const individual = [
      {
        simulationIndex: 0,
        winningNumbers: { mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] },
        totalWinnings: 10,
        netProfit: 10,
        winsByClass: { 12: 1 },
      },
    ] as any
    const totalCost = 0
    const res = calculateBatchStatistics(individual, totalCost)

    // Core Economics (per play) with zero cost
    expect(res.stakePerPlay).toBe(0)
    expect(res.expectedPayoutPerPlay).toBe(10)
    expect(res.expectedProfitPerPlay).toBe(10)
    expect(res.returnToPlayer).toBe(0) // Division by zero protection
    expect(res.houseEdge).toBe(0) // 0 when stake is 0
    expect(res.expectedLossPerEuro).toBe(0) // 0 when stake is 0

    // Hit Quality
    expect(res.hitRate).toBe(100) // 1 hit out of 1
    expect(res.profitRate).toBe(100) // €10 >= €0 stake
    expect(res.averagePayoutWhenHit).toBe(10)
    expect(res.averageNetWhenHit).toBe(10)

    // Why Win Rate ≠ Profit
    expect(res.neededAveragePayoutToBreakEven).toBe(0)
    expect(res.payoutShortfall).toBe(-10) // Negative shortfall = surplus
    // New break-even diagnostics - zero cost edge case
    expect(res.payoutMultiplierNeeded).toBe(0) // 0/10 = 0 (no multiplier needed)
    expect(res.breakEvenHitRateAtCurrentPrize).toBe(0) // (0/10)*100 = 0% hit rate needed
    expect(res.breakEvenAvgPrizeAtCurrentHitRate).toBe(0) // 0/(100/100) = €0 avg prize needed
    expect(res.expectedPlaysPerHit).toBe(1) // 100/100 = 1 play per hit
    expect(res.netIfEveryPlayHit).toBe(10)
  })

  it('calculateBatchStatistics shows realistic lottery economics', () => {
    // Simulate realistic lottery scenario: high win rate but small prizes
    const individual = Array.from({ length: 1000 }, (_, i) => ({
      simulationIndex: i,
      winningNumbers: { mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] },
      totalWinnings: i < 300 ? 4 : 0, // 30% win rate, €4 average prize
      netProfit: i < 300 ? 4 - 20 : -20, // €20 cost per simulation
      winsByClass: i < 300 ? { 12: 1 } : {},
    }))

    const totalCost = 20000 // 1000 * €20
    const res = calculateBatchStatistics(individual as any, totalCost)

    // Core Economics (per play) - shows the mathematical reality
    expect(res.stakePerPlay).toBe(20) // €20 stake per play
    expect(res.expectedPayoutPerPlay).toBe(1.2) // €1.20 expected payout
    expect(res.expectedProfitPerPlay).toBe(-18.8) // €-18.80 expected loss per play
    expect(res.returnToPlayer).toBeCloseTo(0.06, 2) // 6% RTP (1.2/20)
    expect(res.houseEdge).toBeCloseTo(0.94, 2) // 94% house edge
    expect(res.expectedLossPerEuro).toBeCloseTo(0.94, 2) // 94 cents lost per euro invested

    // Hit Quality - separates hitting from profiting
    expect(res.hitRate).toBe(30) // 30% hit rate sounds good
    expect(res.profitRate).toBe(0) // But 0% profit rate because €4 < €20 stake
    expect(res.averagePayoutWhenHit).toBe(4) // €4 average payout when hitting
    expect(res.averageNetWhenHit).toBe(-16) // Still lose €16 per hit

    // Why Win Rate ≠ Profit - the educational explanation
    expect(res.neededAveragePayoutToBreakEven).toBe(20) // Need €20 average payout
    expect(res.payoutShortfall).toBe(18.8) // €18.80 shortfall (20 - 1.2)
    // New break-even diagnostics - realistic lottery scenario
    expect(res.payoutMultiplierNeeded).toBeCloseTo(16.67, 1) // 20/1.2 = 16.67x needed
    expect(res.breakEvenHitRateAtCurrentPrize).toBe(null) // 500% sanitized to null (impossible)
    expect(res.breakEvenAvgPrizeAtCurrentHitRate).toBeCloseTo(66.67, 1) // 20/(30/100) = €66.67 avg prize needed
    expect(res.netIfEveryPlayHit).toBe(-16) // Even at 100% hit rate, lose €16 per simulation
    expect(res.expectedPlaysPerHit).toBeCloseTo(3.33, 1) // 100/30 = 3.33 plays per hit

    // Legacy metrics for backward compatibility
    expect(res.winDistribution.winPercentage).toBe(30) // 30% win rate sounds good
    expect(res.averagePrizePerWin).toBe(4) // But average prize is only €4
    // removed: worstCaseScenario
    expect(res.expectedNetReturn).toBe(-18.8) // Actual expected loss per simulation
    expect(res.returnRatePerEuro).toBe(0.06) // Only 6% return per euro invested
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
