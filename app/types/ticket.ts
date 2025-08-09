export interface Ticket {
  /** Unique identifier for the ticket */
  id: number;
  /** Array of main numbers selected for the ticket */
  mainNumbers: number[];
  /** Array of euro numbers selected for the ticket */
  euroNumbers: number[];
  /** Array of winning main numbers (if any) */
  winningMainNumbers?: number[];
  /** Array of winning euro numbers (if any) */
  winningEuroNumbers?: number[];
  /** The winning class of the ticket (if applicable) */
  winClass?: number;
}

export interface TicketSet {
  /** Identifier for the set of tickets */
  setNumber: number;
  /** Array of tickets in this set */
  tickets: Ticket[];
}