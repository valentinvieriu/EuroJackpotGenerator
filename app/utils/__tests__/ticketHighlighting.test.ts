import { describe, it, expect } from 'vitest'
import {
  buildTicketHighlightUpdate,
  buildTicketHighlightUpdates,
} from '../ticketHighlighting'
import type { Ticket } from '~/schemas/ticket'

describe('ticketHighlighting', () => {
  const mockTicket: Ticket = {
    id: 1,
    mainNumbers: [1, 2, 3, 4, 5],
    euroNumbers: [6, 7],
  }

  describe('buildTicketHighlightUpdate', () => {
    it('should correctly identify matching numbers', () => {
      const winningMain = [1, 2, 10, 11, 12]
      const winningEuro = [6, 8]

      const result = buildTicketHighlightUpdate(
        mockTicket,
        winningMain,
        winningEuro
      )

      expect(result.id).toBe(1)
      expect(result.winningMainNumbers).toEqual([1, 2])
      expect(result.winningEuroNumbers).toEqual([6])
    })

    it('should handle no matches', () => {
      const winningMain = [10, 11, 12, 13, 14]
      const winningEuro = [8, 9]

      const result = buildTicketHighlightUpdate(
        mockTicket,
        winningMain,
        winningEuro
      )

      expect(result.winningMainNumbers).toEqual([])
      expect(result.winningEuroNumbers).toEqual([])
    })

    it('should calculate win class counts correctly', () => {
      const winningMain = [1, 2, 10, 11, 12]
      const winningEuro = [6, 8]

      const result = buildTicketHighlightUpdate(
        mockTicket,
        winningMain,
        winningEuro
      )

      // With 2 main matches and 1 euro match, should have win classes
      expect(Object.keys(result.winClassCounts).length).toBeGreaterThan(0)
      expect(result.winClass).toBeDefined()
    })
  })

  describe('buildTicketHighlightUpdates', () => {
    it('should process multiple tickets', () => {
      const tickets: Ticket[] = [
        mockTicket,
        {
          id: 2,
          mainNumbers: [10, 11, 12, 13, 14],
          euroNumbers: [8, 9],
        },
      ]

      const winningMain = [1, 2, 10, 11, 12]
      const winningEuro = [6, 8]

      const results = buildTicketHighlightUpdates(
        tickets,
        winningMain,
        winningEuro
      )

      expect(results).toHaveLength(2)
      expect(results[0].id).toBe(1)
      expect(results[1].id).toBe(2)

      // First ticket should have matches
      expect(results[0].winningMainNumbers).toEqual([1, 2])
      expect(results[0].winningEuroNumbers).toEqual([6])

      // Second ticket should also have matches
      expect(results[1].winningMainNumbers).toEqual([10, 11, 12])
      expect(results[1].winningEuroNumbers).toEqual([8])
    })
  })
})
