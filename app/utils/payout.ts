import type { EurojackpotHistoricOdds } from '~/types/winning'

/**
 * Build a Map<winningClass, amount> from odds data.
 * Filters to classes 1..12 and non-negative amounts.
 */
export function buildOddsMap(
  data: EurojackpotHistoricOdds
): Map<number, number> {
  const map = new Map<number, number>()
  if (!data?.eurojackpotOdds) return map
  for (const odd of data.eurojackpotOdds) {
    if (
      typeof odd.winningClass === 'number' &&
      odd.winningClass >= 1 &&
      odd.winningClass <= 12 &&
      typeof odd.amount === 'number' &&
      odd.amount >= 0
    ) {
      map.set(odd.winningClass, odd.amount)
    }
  }
  return map
}
