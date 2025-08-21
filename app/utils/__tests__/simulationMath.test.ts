import { describe, it, expect } from 'vitest'
import {
  calculateTotalSimulationCost,
  calculateBreakEvenPercentage,
  getWinClassArray,
  calculateProfitabilityMetrics,
  getCostPerSimulation,
  formatReturnRatePercentage,
  isProfitableExpectation,
  formatEuroAmount,
  compareWinRates,
} from '../simulationMath'
import type { Ticket } from '~/schemas'

describe('simulationMath', () => {
  // Mock tickets for testing
  const mockTicket5x2: Ticket = {
    id: 1,
    mainNumbers: [1, 2, 3, 4, 5],
    euroNumbers: [1, 2],
    linesCount: 1, // 5x2 = 1 line
  }

  const mockTicket6x3: Ticket = {
    id: 2,
    mainNumbers: [1, 2, 3, 4, 5, 6],
    euroNumbers: [1, 2, 3],
    linesCount: 3, // 6x3 = 3 lines
  }

  describe('calculateTotalSimulationCost', () => {
    it('calculates cost for single standard ticket (5x2)', () => {
      const cost = calculateTotalSimulationCost([mockTicket5x2])
      expect(cost).toBe(2.0) // 1 line × €2.00
    })

    it('calculates cost for system ticket (6x3)', () => {
      const cost = calculateTotalSimulationCost([mockTicket6x3])
      expect(cost).toBe(6.0) // 3 lines × €2.00
    })

    it('calculates cost for multiple tickets', () => {
      const cost = calculateTotalSimulationCost([mockTicket5x2, mockTicket6x3])
      expect(cost).toBe(8.0) // (1 + 3) lines × €2.00
    })

    it('returns 0 for empty ticket array', () => {
      const cost = calculateTotalSimulationCost([])
      expect(cost).toBe(0)
    })
  })

  describe('calculateBreakEvenPercentage', () => {
    it('calculates break-even percentage correctly', () => {
      const tickets = [mockTicket5x2] // €2.00 cost
      const totalPossibleWinnings = 10.0 // €10.00 potential winnings

      const breakEven = calculateBreakEvenPercentage(
        tickets,
        totalPossibleWinnings
      )
      expect(breakEven).toBe(20.0) // 2/10 * 100 = 20%
    })

    it('returns 100% when no possible winnings', () => {
      const tickets = [mockTicket5x2]
      const totalPossibleWinnings = 0

      const breakEven = calculateBreakEvenPercentage(
        tickets,
        totalPossibleWinnings
      )
      expect(breakEven).toBe(100)
    })

    it('returns 0% when cost is zero (free tickets)', () => {
      const tickets: Ticket[] = [] // No tickets = no cost
      const totalPossibleWinnings = 10.0

      const breakEven = calculateBreakEvenPercentage(
        tickets,
        totalPossibleWinnings
      )
      expect(breakEven).toBe(0)
    })

    it('caps break-even percentage at 100%', () => {
      const tickets = [mockTicket5x2] // €2.00 cost
      const totalPossibleWinnings = 1.0 // Only €1.00 potential

      const breakEven = calculateBreakEvenPercentage(
        tickets,
        totalPossibleWinnings
      )
      expect(breakEven).toBe(100)
    })
  })

  describe('getWinClassArray', () => {
    it('returns correct win class array', () => {
      const winClasses = getWinClassArray()
      expect(winClasses).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
      expect(winClasses).toHaveLength(12)
    })

    it('returns readonly array', () => {
      const winClasses = getWinClassArray()
      // TypeScript ensures this is readonly at compile time
      // Runtime immutability is not enforced by default in JavaScript
      expect(winClasses).toBeInstanceOf(Array)
      expect(winClasses.length).toBe(12)
    })
  })

  describe('calculateProfitabilityMetrics', () => {
    it('calculates metrics for profitable scenario', () => {
      const totalCost = 100
      const totalWinnings = 150

      const metrics = calculateProfitabilityMetrics(totalCost, totalWinnings)

      expect(metrics.netProfit).toBe(50.0)
      expect(metrics.roiPercentage).toBe(50.0) // 50/100 * 100
      expect(metrics.profitMargin).toBe(33.33) // 50/150 * 100
      expect(metrics.isProfit).toBe(true)
    })

    it('calculates metrics for losing scenario', () => {
      const totalCost = 100
      const totalWinnings = 50

      const metrics = calculateProfitabilityMetrics(totalCost, totalWinnings)

      expect(metrics.netProfit).toBe(-50.0)
      expect(metrics.roiPercentage).toBe(-50.0)
      expect(metrics.profitMargin).toBe(-100.0) // -50/50 * 100
      expect(metrics.isProfit).toBe(false)
    })

    it('handles zero cost scenario', () => {
      const totalCost = 0
      const totalWinnings = 100

      const metrics = calculateProfitabilityMetrics(totalCost, totalWinnings)

      expect(metrics.netProfit).toBe(100.0)
      expect(metrics.roiPercentage).toBe(0) // Division by zero case
      expect(metrics.profitMargin).toBe(100.0)
      expect(metrics.isProfit).toBe(true)
    })

    it('handles zero winnings scenario', () => {
      const totalCost = 100
      const totalWinnings = 0

      const metrics = calculateProfitabilityMetrics(totalCost, totalWinnings)

      expect(metrics.netProfit).toBe(-100.0)
      expect(metrics.roiPercentage).toBe(-100.0)
      expect(metrics.profitMargin).toBe(0) // Division by zero case
      expect(metrics.isProfit).toBe(false)
    })
  })

  describe('getCostPerSimulation', () => {
    it('returns same result as calculateTotalSimulationCost', () => {
      const tickets = [mockTicket5x2, mockTicket6x3]

      const cost1 = getCostPerSimulation(tickets)
      const cost2 = calculateTotalSimulationCost(tickets)

      expect(cost1).toBe(cost2)
      expect(cost1).toBe(8.0)
    })
  })

  describe('formatReturnRatePercentage', () => {
    it('formats return rate as percentage correctly', () => {
      expect(formatReturnRatePercentage(0.179)).toBe('17.9%')
      expect(formatReturnRatePercentage(0.5)).toBe('50.0%')
      expect(formatReturnRatePercentage(1.0)).toBe('100.0%')
      expect(formatReturnRatePercentage(0)).toBe('0.0%')
    })

    it('handles decimal precision correctly', () => {
      expect(formatReturnRatePercentage(0.12345)).toBe('12.3%')
      expect(formatReturnRatePercentage(0.9999)).toBe('100.0%')
    })
  })

  describe('isProfitableExpectation', () => {
    it('correctly identifies profitable scenarios', () => {
      expect(isProfitableExpectation(5.5)).toBe(true)
      expect(isProfitableExpectation(0.01)).toBe(true)
      expect(isProfitableExpectation(0)).toBe(false)
      expect(isProfitableExpectation(-0.01)).toBe(false)
      expect(isProfitableExpectation(-16.43)).toBe(false)
    })
  })

  describe('formatEuroAmount', () => {
    it('formats positive euro amounts correctly', () => {
      expect(formatEuroAmount(3.57)).toBe('€3.57')
      expect(formatEuroAmount(0)).toBe('€0.00')
      expect(formatEuroAmount(1000.99)).toBe('€1000.99')
    })

    it('formats negative euro amounts correctly', () => {
      expect(formatEuroAmount(-16.43)).toBe('-€16.43')
      expect(formatEuroAmount(-0.01)).toBe('-€0.01')
      expect(formatEuroAmount(-1000.5)).toBe('-€1000.50')
    })

    it('handles decimal precision correctly', () => {
      expect(formatEuroAmount(5.678)).toBe('€5.68')
      expect(formatEuroAmount(-5.678)).toBe('-€5.68')
      expect(formatEuroAmount(5.1)).toBe('€5.10')
    })
  })

  describe('compareWinRates', () => {
    it('correctly compares win rates above break-even', () => {
      const result = compareWinRates(30, 25) // 30% actual vs 25% needed
      expect(result.isAboveBreakEven).toBe(true)
      expect(result.differencePercentage).toBe(5.0)
      expect(result.multiplier).toBe(1.2) // 30/25 = 1.2
    })

    it('correctly compares win rates below break-even', () => {
      const result = compareWinRates(20, 35) // 20% actual vs 35% needed
      expect(result.isAboveBreakEven).toBe(false)
      expect(result.differencePercentage).toBe(-15.0)
      expect(result.multiplier).toBe(0.57) // 20/35 ≈ 0.57
    })

    it('handles zero break-even rate', () => {
      const result = compareWinRates(15, 0) // 15% actual vs 0% needed
      expect(result.isAboveBreakEven).toBe(true)
      expect(result.differencePercentage).toBe(15.0)
      expect(result.multiplier).toBe(0) // Division by zero case
    })

    it('handles exact break-even match', () => {
      const result = compareWinRates(25, 25) // Exactly at break-even
      expect(result.isAboveBreakEven).toBe(false) // Exactly equal is not "above"
      expect(result.differencePercentage).toBe(0.0)
      expect(result.multiplier).toBe(1.0)
    })
  })
})
