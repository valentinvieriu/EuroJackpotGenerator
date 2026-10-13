import { describe, it, expect } from 'vitest'
import { calculateTotalSimulationCost } from '../simulationMath'
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

    it('derives the line count from the numbers when it is not given', () => {
      const systemTicket: Ticket = {
        id: 3,
        mainNumbers: [1, 2, 3, 4, 5, 6],
        euroNumbers: [1, 2, 3],
      }
      // C(6,5) × C(3,2) = 18 lines × €2.00
      expect(calculateTotalSimulationCost([systemTicket])).toBe(36)
    })
  })
})
