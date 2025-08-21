/**
 * Business calculation utilities for simulation math
 * Centralizes cost calculations, break-even analysis, and other business logic
 */

import type { Ticket } from '~/schemas'
import { combinationCount } from '~/utils/combinatorics'
import { PRICE_PER_LINE } from '~/utils/pricing'
import { WIN_CLASSES } from '~/utils/constants'

/**
 * Calculate the total cost per simulation for a set of tickets
 * @param tickets Array of tickets to calculate cost for
 * @returns Total cost in euros for one simulation across all tickets
 */
export function calculateTotalSimulationCost(tickets: Ticket[]): number {
  return tickets.reduce((sum, ticket) => {
    // Use the linesCount property if available, otherwise calculate from numbers
    const lines =
      ticket.linesCount ??
      combinationCount(ticket.mainNumbers.length, ticket.euroNumbers.length)
    return sum + lines * PRICE_PER_LINE
  }, 0)
}

/**
 * Calculate break-even percentage for a simulation
 * Break-even is the win rate needed to cover the simulation cost
 * @param tickets Array of tickets
 * @param totalPossibleWinnings Total amount that could be won if all prizes hit
 * @returns Break-even percentage (0-100)
 */
export function calculateBreakEvenPercentage(
  tickets: Ticket[],
  totalPossibleWinnings: number
): number {
  const totalCost = calculateTotalSimulationCost(tickets)

  if (totalPossibleWinnings <= 0) {
    return 100 // Impossible to break even
  }

  if (totalCost <= 0) {
    return 0 // Already profitable
  }

  const breakEvenPercentage = (totalCost / totalPossibleWinnings) * 100
  return Math.min(100, Math.max(0, breakEvenPercentage))
}

/**
 * Generate array of win class numbers for UI components
 * Uses constants to ensure consistency across the application
 * @returns Readonly array of win class numbers [1, 2, 3, ..., 12]
 */
export function getWinClassArray(): readonly number[] {
  return WIN_CLASSES
}

/**
 * Calculate expected value metrics for a simulation
 * @param totalCost Total cost of the simulation
 * @param totalWinnings Total winnings from the simulation
 * @returns Object with various profitability metrics
 */
export function calculateProfitabilityMetrics(
  totalCost: number,
  totalWinnings: number
): {
  netProfit: number
  roiPercentage: number
  profitMargin: number
  isProfit: boolean
} {
  const netProfit = totalWinnings - totalCost
  const roiPercentage = totalCost > 0 ? (netProfit / totalCost) * 100 : 0
  const profitMargin = totalWinnings > 0 ? (netProfit / totalWinnings) * 100 : 0

  return {
    netProfit: Number(netProfit.toFixed(2)),
    roiPercentage: Number(roiPercentage.toFixed(2)),
    profitMargin: Number(profitMargin.toFixed(2)),
    isProfit: netProfit > 0,
  }
}

/**
 * Calculate cost per simulation for display in components
 * Helper function that wraps calculateTotalSimulationCost with better naming for UI
 * @param tickets Array of tickets
 * @returns Cost per simulation in euros
 */
export function getCostPerSimulation(tickets: Ticket[]): number {
  return calculateTotalSimulationCost(tickets)
}

/**
 * Format return rate as a percentage for display
 * @param returnRate The return rate per euro (e.g., 0.179)
 * @returns Formatted percentage string (e.g., "17.9%")
 */
export function formatReturnRatePercentage(returnRate: number): string {
  return `${(returnRate * 100).toFixed(1)}%`
}

/**
 * Determine if expected return indicates a profitable scenario
 * @param expectedNetReturn The expected net return per simulation
 * @returns True if profitable, false if losing scenario
 */
export function isProfitableExpectation(expectedNetReturn: number): boolean {
  return expectedNetReturn > 0
}

/**
 * Format currency amounts with proper Euro symbol and sign
 * @param amount The amount in euros
 * @returns Formatted string (e.g., "€3.57", "-€16.43")
 */
export function formatEuroAmount(amount: number): string {
  const sign = amount >= 0 ? '' : '-'
  const absAmount = Math.abs(amount)
  return `${sign}€${absAmount.toFixed(2)}`
}

/**
 * Calculate how much better/worse the win rate is compared to break-even
 * @param actualWinRate Current win rate percentage
 * @param breakEvenWinRate Required win rate to break even
 * @returns Object with comparison metrics
 */
export function compareWinRates(
  actualWinRate: number,
  breakEvenWinRate: number
): {
  isAboveBreakEven: boolean
  differencePercentage: number
  multiplier: number
} {
  const difference = actualWinRate - breakEvenWinRate
  const multiplier = breakEvenWinRate > 0 ? actualWinRate / breakEvenWinRate : 0

  return {
    isAboveBreakEven: difference > 0,
    differencePercentage: Number(difference.toFixed(1)),
    multiplier: Number(multiplier.toFixed(2)),
  }
}
