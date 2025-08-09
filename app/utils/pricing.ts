import { combinationCount } from '~/utils/combinatorics'

export const PRICE_PER_LINE = 2.0

export function systemPrice(mainCount: number, euroCount: number): number {
  return combinationCount(mainCount, euroCount) * PRICE_PER_LINE
}
