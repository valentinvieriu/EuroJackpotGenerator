/**
 * Rounds - what the machine took and paid out, one set of tickets at a time
 *
 * A round is everything played on one set of tickets. Putting other tickets
 * on the table closes it, so every strategy tried gets its own line, while
 * the total over all rounds keeps what the player has spent in the sitting.
 */

import type { Ticket } from '~/schemas'
import type { SelectionMethod } from '~/schemas/urlConfig'
import { MAIN_NUMBERS_COUNT, EURO_NUMBERS_COUNT } from '~/utils/constants'
import { formatCount } from '~/utils/format'

/** Draws played, money paid in and money won back */
export interface Ledger {
  draws: number
  spent: number
  won: number
}

/** A closed round: what one set of tickets did */
export interface Round extends Ledger {
  /** The tickets the round was played on, e.g. "10 tickets · random" */
  label: string
}

export const emptyLedger = (): Ledger => ({ draws: 0, spent: 0, won: 0 })

export const addLedgers = (...ledgers: Ledger[]): Ledger =>
  ledgers.reduce<Ledger>(
    (sum, ledger) => ({
      draws: sum.draws + ledger.draws,
      spent: sum.spent + ledger.spent,
      won: sum.won + ledger.won,
    }),
    emptyLedger()
  )

/**
 * Share of the money paid in that the machine kept, e.g. 0.85. Negative when
 * more came back than went in; null while nothing has been paid in.
 */
export const keptShare = ({ spent, won }: Ledger): number | null =>
  spent > 0 ? (spent - won) / spent : null

const METHOD_LABELS: Record<SelectionMethod, string> = {
  random: 'random',
  unpopular: 'unpopular picks',
  favorites: 'favorite numbers',
  weighted: 'weighted by past draws',
}

/**
 * Name a set of tickets the way a player would tell it apart from the
 * others they tried: how many, which format, how the numbers were picked.
 */
export function describeTicketSet(
  tickets: Pick<Ticket, 'mainNumbers' | 'euroNumbers'>[],
  method: SelectionMethod | null
): string {
  // Tickets per format, in the order the formats first appear
  const formats = new Map<
    string,
    { main: number; euro: number; count: number }
  >()
  for (const { mainNumbers, euroNumbers } of tickets) {
    const key = `${mainNumbers.length}+${euroNumbers.length}`
    const format = formats.get(key)
    if (format) format.count++
    else
      formats.set(key, {
        main: mainNumbers.length,
        euro: euroNumbers.length,
        count: 1,
      })
  }

  const parts = [...formats.values()].map(({ main, euro, count }) => {
    if (main === MAIN_NUMBERS_COUNT && euro === EURO_NUMBERS_COUNT) {
      return `${formatCount(count)} ${count === 1 ? 'ticket' : 'tickets'}`
    }
    const system = `System ${main}+${euro}`
    return count === 1 ? system : `${formatCount(count)} × ${system}`
  })

  const described = parts.join(', ') || 'No tickets'
  return method ? `${described} · ${METHOD_LABELS[method]}` : described
}
