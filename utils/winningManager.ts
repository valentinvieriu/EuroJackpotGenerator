import type { EurojackpotHistoricOdds } from '~/types/winning';
import { determineWinClass } from './winningClasses';
import type { Ticket } from '~/types/ticket';

export function calculateTotalWinnings(tickets: Ticket[], winningData: EurojackpotHistoricOdds): number {
  let totalWinnings = 0;

  // Ensure winningData and eurojackpotOdds exist
  if (!winningData?.eurojackpotOdds) {
    console.warn("Cannot calculate winnings: Winning data or odds information is missing.");
    return 0;
  }

  const oddsMap = new Map<number, number>();
  winningData.eurojackpotOdds.forEach(odd => {
    oddsMap.set(odd.winningClass, odd.amount);
  });


  tickets.forEach(ticket => {
    if (ticket.winClass && oddsMap.has(ticket.winClass)) {
       totalWinnings += oddsMap.get(ticket.winClass)!;
    }
  });

  // Format to 2 decimal places to avoid floating point issues with currency
  return parseFloat(totalWinnings.toFixed(2));
}