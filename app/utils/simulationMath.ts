import type { Ticket } from '~/schemas'
import { combinationCount } from '~/utils/combinatorics'
import { PRICE_PER_LINE } from '~/utils/pricing'

/**
 * Stake for one draw across a set of tickets: every line of every ticket.
 * Uses each ticket's `linesCount` when present, otherwise derives it from the
 * numbers picked.
 */
export function calculateTotalSimulationCost(tickets: Ticket[]): number {
  return tickets.reduce((sum, ticket) => {
    const lines =
      ticket.linesCount ??
      combinationCount(ticket.mainNumbers.length, ticket.euroNumbers.length)
    return sum + lines * PRICE_PER_LINE
  }, 0)
}
