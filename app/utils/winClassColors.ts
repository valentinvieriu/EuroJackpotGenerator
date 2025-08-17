/**
 * Centralized win class color mapping utility.
 * Provides consistent color scheme for lottery win classes across all components.
 */

/**
 * Gets the appropriate Tailwind CSS color class for a win class number.
 * Returns different colors based on the significance of the win class:
 * - Classes 1-3 (highest): Yellow/Gold for major wins
 * - Classes 4-6 (medium): Green for moderate wins
 * - Classes 7-9 (lower): Blue for minor wins
 * - Classes 10-12 (lowest): Gray for minimal wins
 * - No wins: Gray for inactive state
 *
 * @param classNum The win class number (1-12)
 * @param hasWins Whether this class has any wins (for conditional styling)
 * @returns Tailwind CSS color class string
 */
export function getWinClassColor(
  classNum: number,
  hasWins: boolean = true
): string {
  if (!hasWins) return 'text-content-muted'

  switch (classNum) {
    case 1:
    case 2:
    case 3:
      return 'text-yellow-400' // Major wins - gold/yellow
    case 4:
    case 5:
    case 6:
      return 'text-green-400' // Moderate wins - green
    case 7:
    case 8:
    case 9:
      return 'text-blue-400' // Minor wins - blue
    default:
      return 'text-content-secondary' // Minimal wins - light gray
  }
}

/**
 * Gets win class color for BatchSimulationProgress component.
 * Checks if the class has wins in the partial results.
 *
 * @param classNum The win class number (1-12)
 * @param winsByClass Object mapping class numbers to win counts
 * @returns Tailwind CSS color class string
 */
export function getProgressWinClassColor(
  classNum: number,
  winsByClass: Record<number, number>
): string {
  const hasWins = Boolean(winsByClass[classNum])
  return getWinClassColor(classNum, hasWins)
}

/**
 * Gets win class color for BatchSimulationResults component.
 * Checks if the class has wins in the final results.
 *
 * @param classNum The win class number (1-12)
 * @param winsByClass Object mapping class numbers to win counts
 * @returns Tailwind CSS color class string
 */
export function getResultsWinClassColor(
  classNum: number,
  winsByClass: Record<number, number>
): string {
  const count = winsByClass[classNum] || 0
  const hasWins = count > 0
  return getWinClassColor(classNum, hasWins)
}
