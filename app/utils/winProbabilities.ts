/**
 * EuroJackpot win class probabilities
 * Based on official EuroJackpot odds (5 from 50 main numbers + 2 from 12 euro numbers)
 */
export const WIN_CLASS_PROBABILITIES: Record<number, number> = {
  1: 1 / 139838160, // 5+2 Jackpot
  2: 1 / 6991908, // 5+1
  3: 1 / 3107515, // 5+0
  4: 1 / 621503, // 4+2
  5: 1 / 31075, // 4+1
  6: 1 / 14125, // 3+2
  7: 1 / 13811, // 4+0
  8: 1 / 985, // 2+2
  9: 1 / 706, // 3+1
  10: 1 / 314, // 3+0
  11: 1 / 188, // 1+2
  12: 1 / 49, // 2+1
}

/**
 * Gets the probability of winning a specific prize class for a single line
 * @param winClass The winning class (1-12)
 * @returns The probability of winning that class
 */
export function getWinClassProbability(winClass: number): number {
  return WIN_CLASS_PROBABILITIES[winClass] || 0
}
