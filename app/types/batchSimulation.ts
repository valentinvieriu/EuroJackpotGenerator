// types/batchSimulation.ts

export interface BatchSimulationResult {
  /** Total number of simulations run */
  totalSimulations: number
  /** Total cost of all tickets across all simulations */
  totalCost: number
  /** Total winnings across all simulations */
  totalWinnings: number
  /** Net profit/loss (totalWinnings - totalCost) */
  netProfit: number
  /** Return on Investment as percentage */
  roiPercentage: number
  /** Expected value per simulation */
  expectedValue: number
  /** Distribution of wins by winning class */
  winDistribution: WinDistribution
  /** Statistical summary of results */
  statistics: SimulationStatistics
  /** Individual simulation results (optional, for detailed analysis) */
  individualResults?: IndividualSimulationResult[]
  /** Lightweight data for ticket highlighting (always included) */
  highlightingData?: TicketHighlightingData
}

export interface WinDistribution {
  /** Number of wins per winning class (class 1-12) */
  winsByClass: Record<number, number>
  /** Total number of winning simulations */
  totalWins: number
  /** Total number of losing simulations */
  totalLosses: number
  /** Win percentage */
  winPercentage: number
}

export interface SimulationStatistics {
  /** Mean winnings per simulation */
  meanWinnings: number
  /** Median winnings per simulation */
  medianWinnings: number
  /** Standard deviation of winnings */
  standardDeviation: number
  /** Minimum winnings in any simulation */
  minWinnings: number
  /** Maximum winnings in any simulation */
  maxWinnings: number
  /** 25th percentile of winnings */
  percentile25: number
  /** 75th percentile of winnings */
  percentile75: number
  /** 95th percentile of winnings */
  percentile95: number
  /** Number of simulations that resulted in profit */
  profitableSimulations: number
  /** Percentage of simulations that resulted in profit */
  profitablePercentage: number
}

export interface IndividualSimulationResult {
  /** Simulation index */
  simulationIndex: number
  /** Winning numbers drawn */
  winningNumbers: {
    mainNumbers: number[]
    euroNumbers: number[]
  }
  /** Total winnings for this simulation */
  totalWinnings: number
  /** Net profit/loss for this simulation */
  netProfit: number
  /** Winning tickets count by class */
  winsByClass: Record<number, number>
}

export interface BatchSimulationRequest {
  /** Array of tickets to simulate */
  tickets: import('./ticket').Ticket[]
  /** Number of simulations to run */
  simulationCount: number
  /** Whether to include individual results (memory intensive) */
  includeIndividualResults?: boolean
  /** Batch size for processing (default: 100) */
  batchSize?: number
}

export interface TicketHighlightingData {
  /** Per-ticket aggregated winning data for highlighting */
  ticketStats: Record<
    number,
    {
      /** How many times each main number appeared in winning draws for this ticket */
      mainNumberFrequency: Record<number, number>
      /** How many times each euro number appeared in winning draws for this ticket */
      euroNumberFrequency: Record<number, number>
      /** Total win class counts across all simulations */
      winClassCounts: Record<number, number>
      /** Total number of simulations this ticket won */
      totalWins: number
    }
  >
}

export interface BatchSimulationProgress {
  /** Current simulation being processed */
  currentSimulation: number
  /** Total simulations to process */
  totalSimulations: number
  /** Progress percentage (0-100) */
  progressPercentage: number
  /** Estimated time remaining as human-readable string */
  estimatedTimeRemaining?: string | null
  /** Whether the simulation can be cancelled */
  canCancel: boolean
}
