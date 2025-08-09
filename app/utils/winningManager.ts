import type { EurojackpotHistoricOdds } from '~/types/winning'
import type { Ticket } from '~/types/ticket'
// determineWinClass is used in the component to assign winClass to tickets, not directly here.

/**
 * Calculates the total winnings for a list of tickets based on provided winning odds data.
 *
 * @param tickets An array of Ticket objects. Each ticket *should* have its `winClass` property
 *                populated (1-12 or undefined) before calling this function.
 * @param winningData The official historic odds data for a specific draw, containing amounts per winning class.
 *                    The `winningClass` in this data should be normalized (1-12).
 * @returns The total calculated winnings as a number, formatted to two decimal places.
 *          Returns 0 if winning data or odds are missing/invalid.
 */
export function calculateTotalWinnings(
  tickets: ReadonlyArray<Ticket>, // Use ReadonlyArray for immutable input
  winningData: EurojackpotHistoricOdds | null, // Allow null for robustness
): number {
  let totalWinnings = 0

  // Validate the presence and structure of the winning data and odds.
  if (
    !winningData?.eurojackpotOdds
    || winningData.eurojackpotOdds.length === 0
  ) {
    console.warn(
      'Cannot calculate winnings: Winning data or eurojackpotOdds array is missing or empty.',
    )
    return 0 // Return 0 if essential data is unavailable.
  }

  // Create a Map for efficient lookup of winnings amount by winning class.
  // Key: winningClass (number, 1-12), Value: amount (number)
  const oddsMap = new Map<number, number>()
  winningData.eurojackpotOdds.forEach((odd) => {
    // Ensure the winningClass is a valid number (1-12) and amount is valid before adding.
    if (
      Number.isInteger(odd.winningClass)
      && odd.winningClass >= 1
      && odd.winningClass <= 12
      && typeof odd.amount === 'number'
      && odd.amount >= 0
    ) {
      oddsMap.set(odd.winningClass, odd.amount)
    }
    else {
      console.warn(
        `Invalid or missing data for winning class entry: ${JSON.stringify(odd)}. Skipping.`,
      )
    }
  })

  // Iterate through each ticket to check for winnings.
  tickets.forEach((ticket) => {
    // Check if the ticket has a valid winning class assigned (1-12).
    if (
      ticket.winClass
      && Number.isInteger(ticket.winClass)
      && ticket.winClass >= 1
      && ticket.winClass <= 12
    ) {
      // Check if this winning class exists in our odds map.
      if (oddsMap.has(ticket.winClass)) {
        // Add the corresponding amount to the total winnings.
        // The non-null assertion (!) is safe here because we checked with oddsMap.has().
        totalWinnings += oddsMap.get(ticket.winClass)!
      }
      else {
        // This case should ideally not happen if winningData is complete, but good to log.
        console.warn(
          `Ticket ${ticket.id} has winClass ${ticket.winClass}, but no corresponding amount found in odds data.`,
        )
      }
    }
    // Tickets without a winClass or with an invalid winClass are ignored.
  })

  // Format the total winnings to two decimal places to handle potential floating-point inaccuracies
  // and represent currency correctly. Use parseFloat to convert back to a number type.
  return Number.parseFloat(totalWinnings.toFixed(2))
}
