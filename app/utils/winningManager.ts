import type { EurojackpotHistoricOdds, Ticket } from '~/schemas'
import { buildOddsMap } from '~/utils/payout'
// determineWinClass is used in the component to assign winClass to tickets, not directly here.

/**
 * Calculates the total winnings for a list of tickets based on provided winning odds data.
 * Supports both legacy single-line tickets (winClass) and new multi-line system tickets (winClassCounts).
 *
 * @param tickets An array of Ticket objects. Each ticket should have either `winClass` or `winClassCounts` populated.
 * @param winningData The official historic odds data for a specific draw, containing amounts per winning class.
 * @returns The total calculated winnings as a number, formatted to two decimal places.
 *          Returns 0 if winning data or odds are missing/invalid.
 */
export function calculateTotalWinnings(
  tickets: ReadonlyArray<Ticket>,
  winningData: EurojackpotHistoricOdds | null
): number {
  if (!winningData?.eurojackpotOdds?.length) {
    return 0
  }

  // Use shared helper to build odds map
  const oddsMap = buildOddsMap(winningData)

  let total = 0
  for (const ticket of tickets) {
    // Handle new multi-line system tickets
    if (ticket.winClassCounts) {
      for (const [cls, count] of Object.entries(ticket.winClassCounts)) {
        const amount = oddsMap.get(Number(cls)) ?? 0
        total += amount * count
      }
    }
    // Handle legacy single-line tickets (backward compatibility)
    else if (ticket.winClass) {
      total += oddsMap.get(ticket.winClass) ?? 0
    }
  }

  return Number(total.toFixed(2))
}
