import { describe, it, expect } from 'vitest'
import {
  calculateBatchStatistics,
  percentileOfCounts,
  simulateSingleDraw,
  type RunTotals,
} from '../batchStatistics'
import { combinationCount } from '../combinatorics'

/** Running totals for a run given as one payout (in euros) per draw */
const totalsOf = (
  payouts: number[],
  stakePerDraw: number,
  winsByClass: Record<number, number> = {}
): RunTotals => {
  const payoutCounts = new Map<number, number>()
  for (const payout of payouts) {
    if (payout <= 0) continue
    const cents = Math.round(payout * 100)
    payoutCounts.set(cents, (payoutCounts.get(cents) ?? 0) + 1)
  }
  return { draws: payouts.length, stakePerDraw, payoutCounts, winsByClass }
}

describe('batchStatistics', () => {
  it('percentileOfCounts matches a percentile over the sorted values', () => {
    // 1, 2, 3, 4, 5
    const single = [1, 2, 3, 4, 5].map((v) => [v, 1] as const)
    expect(percentileOfCounts(single, 0)).toBe(1)
    expect(percentileOfCounts(single, 50)).toBe(3)
    expect(percentileOfCounts(single, 100)).toBe(5)

    // 0, 0, 0, 10: ranks interpolate between neighbouring values
    const repeated = [
      [0, 3],
      [10, 1],
    ] as const
    expect(percentileOfCounts(repeated, 50)).toBe(0)
    expect(percentileOfCounts(repeated, 75)).toBeCloseTo(2.5)
    expect(percentileOfCounts(repeated, 100)).toBe(10)

    expect(percentileOfCounts([], 50)).toBe(0)
  })

  it('describes the payout distribution, empty and non-empty', () => {
    const empty = calculateBatchStatistics(totalsOf([], 0)).statistics
    expect(empty.meanWinnings).toBe(0)

    const stats = calculateBatchStatistics(totalsOf([0, 10, 20], 2)).statistics
    expect(stats.meanWinnings).toBe(10)
    expect(stats.medianWinnings).toBe(10)
    expect(stats.minWinnings).toBe(0)
    expect(stats.maxWinnings).toBe(20)
    expect(stats.standardDeviation).toBe(10)
    expect(stats.profitableSimulations).toBe(2)
    // Profit is the payout less the stake, draw by draw
    expect(stats.medianProfit).toBe(8)
    expect(stats.percentileNet5).toBeCloseTo(-1)
    expect(stats.percentileNet95).toBeCloseTo(17)
    expect(stats.medianRoiPct).toBe(400)
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
    const res = calculateBatchStatistics(totalsOf([10, 0], 2, { 12: 1 }))
    expect(res.totalSimulations).toBe(2)
    expect(res.totalCost).toBe(4)
    expect(res.totalWinnings).toBe(10)
    expect(res.netProfit).toBe(6)
    expect(res.roiPercentage).toBe((6 / 4) * 100)
  })

  it('calculateBatchStatistics computes enhanced metrics correctly', () => {
    // 2 draws at €12 each
    const res = calculateBatchStatistics(totalsOf([20, 0], 12, { 11: 1 }))

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
    expect(res.netIfEveryPlayHit).toBe(8) // 20 - 12 (profit if every play hits)

    // Legacy/derived metrics
    expect(res.averageWinningsPerSimulation).toBe(10) // 20 / 2
    expect(res.expectedNetReturn).toBe(-2) // -4 / 2
    expect(res.returnRatePerEuro).toBe(20 / 24) // ~0.833
    expect(res.averagePrizePerWin).toBe(20) // 20 winnings / 1 win = 20
    expect(res.averageLossPerLosingSimulation).toBe(12) // actual loss for the losing simulation
  })

  it('calculateBatchStatistics handles all-losing scenario', () => {
    const res = calculateBatchStatistics(totalsOf([0, 0], 10))

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
    expect(res.averageLossPerLosingSimulation).toBe(10)
  })

  it('calculateBatchStatistics handles edge case: zero cost', () => {
    const res = calculateBatchStatistics(totalsOf([10], 0, { 12: 1 }))

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
    expect(res.statistics.medianRoiPct).toBe(0)
  })

  it('calculateBatchStatistics shows realistic lottery economics', () => {
    // Simulate realistic lottery scenario: high win rate but small prizes.
    // 1000 draws at €20 each, 30% of them paying €4.
    const payouts = Array.from({ length: 1000 }, (_, i) => (i < 300 ? 4 : 0))
    const res = calculateBatchStatistics(totalsOf(payouts, 20, { 12: 300 }))

    // Core Economics (per play) - shows the mathematical reality
    expect(res.totalCost).toBe(20000)
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
    expect(res.expectedNetReturn).toBe(-18.8) // Actual expected loss per simulation
    expect(res.returnRatePerEuro).toBe(0.06) // Only 6% return per euro invested
  })

  it('counts winning draws and reports every win class', () => {
    const dist = calculateBatchStatistics(
      totalsOf([1, 0], 2, { 12: 1 })
    ).winDistribution
    expect(dist.totalWins).toBe(1)
    expect(dist.totalLosses).toBe(1)
    expect(dist.winsByClass[12]).toBe(1)
    // Classes that never hit are still listed
    expect(Object.keys(dist.winsByClass)).toHaveLength(12)
    expect(dist.winsByClass[1]).toBe(0)
  })
})
