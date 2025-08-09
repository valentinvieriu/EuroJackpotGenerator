import type { StatisticsData } from '../types/statistics'
import { randomFloat, randomInt } from './rng'

/**
 * Selects numbers based on weighted probabilities derived from statistics.
 * Uses a cumulative distribution function approach.
 *
 * @param count The number of unique numbers to generate.
 * @param min The minimum possible number (inclusive).
 * @param max The maximum possible number (inclusive).
 * @param stats Optional statistics data for weighted generation.
 *              If provided, uses 'numbers' or 'additionalNumbers' based on the max value.
 * @returns An array of sorted unique numbers.
 */
export function generateNumbers(
  count: number,
  min: number,
  max: number,
  stats?: StatisticsData['numbers'] | StatisticsData['additionalNumbers']
): number[] {
  // Use weighted generation if valid stats are provided
  if (stats && stats.length > 0) {
    try {
      return generateNumbersWithStatsInternal(count, min, max, stats)
    } catch (error) {
      console.warn(
        `Weighted generation failed: ${error instanceof Error ? error.message : String(error)}. Falling back to random generation.`
      )
    }
  }
  // Default to random generation if no stats or if weighted generation failed
  return generateRandomNumbers(count, min, max)
}

/**
 * Internal function for generating numbers with weighted probabilities based on historical frequency.
 * Uses the square root of frequencies to smooth the probabilities, preventing overly dominant numbers.
 *
 * @param count The number of unique numbers to generate.
 * @param min The minimum possible number (inclusive).
 * @param max The maximum possible number (inclusive).
 * @param stats The statistics data (frequency counts) for the relevant number pool.
 * @returns An array of sorted unique numbers.
 * @throws Error if valid stats cannot be processed or if selection fails repeatedly.
 */
function generateNumbersWithStatsInternal(
  count: number,
  min: number,
  max: number,
  stats: ReadonlyArray<{ number: number; value: number }> // Use ReadonlyArray for safety
): number[] {
  // Validate input stats
  if (!stats || stats.length === 0) {
    throw new Error(
      'No valid statistics data provided for weighted generation.'
    )
  }

  // 1. Adjust values and filter: Use square root to smooth probabilities and filter invalid entries.
  const adjustedStats = stats
    .map((item) => ({
      number: item.number,
      // Using sqrt reduces the dominance of very frequent numbers
      adjustedValue: Math.sqrt(item.value),
    }))
    .filter(
      (item) =>
        Number.isInteger(item.number) &&
        item.number >= min &&
        item.number <= max &&
        Number.isFinite(item.adjustedValue) &&
        item.adjustedValue > 0
    )

  if (adjustedStats.length === 0) {
    throw new Error('No valid statistics after adjusting and filtering.')
  }

  // 2. Weighted sampling without replacement (Efraimidis–Spirakis, B-ES variant)
  // Compute a key for each candidate: key_i = ln(u_i) / w_i, where u_i ~ U(0,1]
  // Then pick the top-`count` items by key (larger is better since ln(u) <= 0).
  if (adjustedStats.length < count) {
    // Not enough valid candidates after filtering; fall back to uniform random
    console.warn(
      `Weighted generation has only ${adjustedStats.length} candidates for ${count} picks. Falling back to uniform random.`
    )
    return generateRandomNumbers(count, min, max)
  }

  const keyed = adjustedStats.map((item) => {
    // Guard against u=0 to avoid -Infinity; EPSILON shifts into (0,1]
    const u = Math.max(Number.EPSILON, randomFloat())
    const key = Math.log(u) / item.adjustedValue // B-ES key
    return { number: item.number, key }
  })

  // Select the top-k keys; for these pool sizes (<= 50/12) sorting is fine
  keyed.sort((a, b) => b.key - a.key)
  const selected = keyed.slice(0, count).map((k) => k.number)

  // Return sorted ascending
  return selected.sort((a, b) => a - b)
}

/**
 * Generates a specified count of unique random numbers within a given range.
 * Uses the efficient Fisher-Yates (Knuth) shuffle algorithm.
 *
 * @param count The number of unique random numbers to generate.
 * @param min The minimum number in the range (inclusive).
 * @param max The maximum number in the range (inclusive).
 * @returns An array of sorted unique random numbers.
 * @throws Error if the range (max - min + 1) is smaller than the requested count.
 */
export function generateRandomNumbers(
  count: number,
  min: number,
  max: number
): number[] {
  const rangeSize = max - min + 1
  if (rangeSize < count) {
    throw new Error(
      `Cannot generate ${count} unique numbers from a range of size ${rangeSize} (${min}-${max})`
    )
  }
  if (count <= 0) {
    return []
  }

  // Create an array containing all numbers in the specified range
  const numbers: number[] = Array.from({ length: rangeSize }, (_, i) => min + i)

  // Shuffle the array using Fisher-Yates algorithm
  // Iterate from the end of the array downwards
  for (let i = numbers.length - 1; i > 0; i--) {
    // Pick a random index from 0 to i (inclusive)
    const j = randomInt(i + 1)
    // Swap the element at index i with the element at the random index j
    ;[numbers[i], numbers[j]] = [numbers[j], numbers[i]]
  }

  // Take the first 'count' numbers from the shuffled array (these are now random)
  // and sort them in ascending order before returning.
  return numbers.slice(0, count).sort((a, b) => a - b)
}
