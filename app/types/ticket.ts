export interface Ticket {
  /** Unique identifier for the ticket */
  id: number
  /** Array of main numbers selected for the ticket */
  mainNumbers: number[]
  /** Array of euro numbers selected for the ticket */
  euroNumbers: number[]
  /** Number of lines this system ticket expands to (C(m,5)*C(e,2)) */
  linesCount?: number
  /** Count of winning lines per class (class -> count) */
  winClassCounts?: Record<number, number>
  /** Array of winning main numbers (if any) */
  winningMainNumbers?: number[]
  /** Array of winning euro numbers (if any) */
  winningEuroNumbers?: number[]
  /** The winning class of the ticket (if applicable) - best (lowest number) class hit */
  winClass?: number
}

export interface TicketSet {
  /** Identifier for the set of tickets */
  setNumber: number
  /** Array of tickets in this set */
  tickets: Ticket[]
}
