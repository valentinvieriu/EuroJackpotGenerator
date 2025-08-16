import { describe, it, expect } from 'vitest'
import {
  calculateTotalSimulationCost,
  calculateBreakEvenPercentage,
  getWinClassArray,
  calculateProfitabilityMetrics,
  getCostPerSimulation,
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
})
