import type { Ticket, EurojackpotHistoricOdds } from '~/schemas'
import { buildTicketHighlightUpdates } from '~/utils/ticketHighlighting'
import { buildOddsMap } from '~/utils/payout'
import { calculateTotalSimulationCost } from '~/utils/simulationMath'

export interface WinningNumbers {
  mainNumbers: number[]
  euroNumbers: number[]
}

/** What one ticket matched in a draw */
export interface TicketHighlight {
  id: number
  winningMainNumbers: number[]
  winningEuroNumbers: number[]
  winClassCounts: Record<number, number>
  winClass?: number
}

/** How a set of tickets did in one draw */
export interface DrawScore {
  ticketHighlights: TicketHighlight[]
  /** Stake for the draw: every line of every ticket */
  stake: number
  totalWinnings: number
  netProfit: number
  /** Infinity when something was won on a zero stake */
  roiPercentage: number
}

const toCents = (amount: number) => Number(amount.toFixed(2))

/**
 * Score tickets against a draw: which numbers matched, what each win class
 * paid, and what that leaves after the stake.
 *
 * This is the single place a draw result is computed, so the same tickets and
 * the same draw always give the same answer, whenever it is asked.
 *
 * Without prize data (`odds` is null) matches are still found but pay nothing.
 */
export function scoreDraw(
  tickets: Ticket[],
  winningNumbers: WinningNumbers,
  odds: EurojackpotHistoricOdds | null
): DrawScore {
  const ticketHighlights = buildTicketHighlightUpdates(
    tickets,
    winningNumbers.mainNumbers,
    winningNumbers.euroNumbers
  )

  let totalWinnings = 0
  if (odds?.eurojackpotOdds?.length) {
    const payouts = buildOddsMap(odds)
    for (const highlight of ticketHighlights) {
      for (const [winClass, count] of Object.entries(
        highlight.winClassCounts
      )) {
        totalWinnings += (payouts.get(Number(winClass)) ?? 0) * count
      }
    }
  }

  const stake = calculateTotalSimulationCost(tickets)
  const netProfit = totalWinnings - stake
  const roiPercentage =
    stake > 0 ? (netProfit / stake) * 100 : totalWinnings > 0 ? Infinity : 0

  return {
    ticketHighlights,
    stake,
    totalWinnings: toCents(totalWinnings),
    netProfit: toCents(netProfit),
    roiPercentage,
  }
}
