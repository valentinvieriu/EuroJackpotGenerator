import { calculateWinningLineCounts } from './combinatorics'
import type { Ticket } from '~/schemas/ticket'

/**
 * Builds a ticket highlight update object for a single ticket given winning numbers.
 * This extracts the common logic used by both single draw and Monte Carlo simulations.
 */
export function buildTicketHighlightUpdate(
  ticket: Ticket,
  winningMain: number[],
  winningEuro: number[]
): {
  id: number
  winningMainNumbers: number[]
  winningEuroNumbers: number[]
  winClassCounts: Record<number, number>
  winClass?: number
} {
  // Find matching numbers
  const winningMainNumbers = ticket.mainNumbers.filter((n: number) =>
    winningMain.includes(n)
  )
  const winningEuroNumbers = ticket.euroNumbers.filter((n: number) =>
    winningEuro.includes(n)
  )

  // Calculate win class counts for this ticket
  const k = winningMainNumbers.length
  const h = winningEuroNumbers.length
  const m = ticket.mainNumbers.length
  const e = ticket.euroNumbers.length

  const winClassCounts = calculateWinningLineCounts(m, e, k, h)

  // Find the lowest (best) win class if any wins exist
  const winClass = Object.keys(winClassCounts)
    .map(Number)
    .sort((a, b) => a - b)[0]

  return {
    id: ticket.id,
    winningMainNumbers,
    winningEuroNumbers,
    winClassCounts,
    winClass,
  }
}

/**
 * Builds highlight updates for multiple tickets at once.
 * Convenience function for batch processing.
 */
export function buildTicketHighlightUpdates(
  tickets: Ticket[],
  winningMain: number[],
  winningEuro: number[]
): Array<{
  id: number
  winningMainNumbers: number[]
  winningEuroNumbers: number[]
  winClassCounts: Record<number, number>
  winClass?: number
}> {
  return tickets.map((ticket) =>
    buildTicketHighlightUpdate(ticket, winningMain, winningEuro)
  )
}
