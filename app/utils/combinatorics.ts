import { determineWinClass } from './winningClasses'

/**
 * Generate all k-combinations from an array
 */
export function kCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (k > arr.length) return []

  const res: T[][] = []
  const choose = (start: number, combo: T[]) => {
    if (combo.length === k) {
      res.push(combo.slice())
      return
    }
    for (let i = start; i <= arr.length - (k - combo.length); i++) {
      combo.push(arr[i])
      choose(i + 1, combo)
      combo.pop()
    }
  }
  choose(0, [])
  return res
}

/**
 * Expand system ticket selections into all possible lines
 */
export function expandSystemLines(main: number[], euro: number[]) {
  const mainLines = kCombinations(main, 5)
  const euroLines = kCombinations(euro, 2)
  const lines: { main: number[]; euro: number[] }[] = []

  for (const m of mainLines) {
    for (const e of euroLines) {
      lines.push({ main: m, euro: e })
    }
  }
  return lines
}

export function combinationCount(m: number, e: number): number {
  return nCr(m, 5) * nCr(e, 2)
}

/**
 * Helper function to calculate binomial coefficient C(n,r)
 */
export function nCr(n: number, r: number): number {
  if (r < 0 || r > n) return 0
  if (r === 0 || r === n) return 1
  r = Math.min(r, n - r)
  let result = 1
  for (let i = 1; i <= r; i++) {
    result = (result * (n - (r - i))) / i
  }
  return result
}

/**
 * Calculate winning line counts for system tickets using combinatorial math
 * Formula: C(k,i) × C(m−k,5−i) × C(h,j) × C(e−h,2−j)
 *
 * @param m - total selected main numbers
 * @param e - total selected euro numbers
 * @param k - how many selected mains are correct
 * @param h - how many selected euros are correct
 * @returns Record of winClass -> count of winning lines
 */
export function calculateWinningLineCounts(
  m: number,
  e: number,
  k: number,
  h: number
): Record<number, number> {
  const winCounts: Record<number, number> = {}

  // Check all possible combinations of matched numbers that could win
  for (let i = 0; i <= Math.min(k, 5); i++) {
    // matched mains in a line (0 to min(k,5))
    for (let j = 0; j <= Math.min(h, 2); j++) {
      // matched euros in a line (0 to min(h,2))

      // Calculate how many lines have exactly i mains and j euros correct
      const linesWithThisMatch =
        nCr(k, i) * nCr(m - k, 5 - i) * nCr(h, j) * nCr(e - h, 2 - j)

      if (linesWithThisMatch > 0) {
        // Determine if this (i,j) combination wins a prize
        const winClass = determineWinClass(i, j)
        if (winClass) {
          winCounts[winClass] = (winCounts[winClass] ?? 0) + linesWithThisMatch
        }
      }
    }
  }

  return winCounts
}
