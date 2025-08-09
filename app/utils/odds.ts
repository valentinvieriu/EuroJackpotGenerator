import type { WinningClass } from '~/types/winning'

/**
 * Normalize a single winning class entry: some Lotto Bayern endpoints
 * return classes as 101–112 instead of 1–12. This converts them.
 */
export function normalizeWinningClass(odd: WinningClass): WinningClass {
  if (
    typeof odd.winningClass === 'number' &&
    odd.winningClass > 100 &&
    odd.winningClass <= 112
  ) {
    return { ...odd, winningClass: odd.winningClass - 100 }
  }
  return odd
}

function hasOdds(data: unknown): data is { eurojackpotOdds: WinningClass[] } {
  if (typeof data !== 'object' || data === null) return false
  const odds = (data as { eurojackpotOdds?: unknown }).eurojackpotOdds
  return Array.isArray(odds)
}

/**
 * Normalize an odds payload so all winningClass values are 1–12.
 * Safe to call on already-normalized data.
 */
export function normalizeOdds<T extends { eurojackpotOdds?: WinningClass[] }>(
  data: T
): T {
  if (!hasOdds(data)) return data
  const eurojackpotOdds = data.eurojackpotOdds.map(normalizeWinningClass)
  return { ...data, eurojackpotOdds }
}
