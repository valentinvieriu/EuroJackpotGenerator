import type { StatisticsData } from '../types/statistics'
import { MAIN_NUMBER_MAX } from './constants'

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
      // Determine if these are main numbers or euro numbers based on the max value
      const isMainNumbers = max === MAIN_NUMBER_MAX
      const relevantStats = isMainNumbers ? stats : stats // In this structure, stats are already pre-filtered

      return generateNumbersWithStatsInternal(count, min, max, relevantStats)
    } catch (error) {
      // Log the error and fall back to purely random generation
      console.warn(
        `Weighted generation failed: ${error instanceof Error ? error.message : String(error)}. Falling back to random generation.`
      )
      // Fallthrough to random generation below
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

  // 2. Build Cumulative Distribution Function (CDF)
  const cumulativeDistribution: { number: number; cumulative: number }[] = []
  let cumulativeSum = 0
  // Sort stats by number to ensure CDF is correctly ordered if stats aren't pre-sorted
  adjustedStats.sort((a, b) => a.number - b.number)

  for (const item of adjustedStats) {
    cumulativeSum += item.adjustedValue
    cumulativeDistribution.push({
      number: item.number,
      cumulative: cumulativeSum, // Store the upper bound of the range for this number
    })
  }

  // Check if the cumulative distribution is valid
  const totalAdjustedValue = cumulativeSum
  if (
    cumulativeDistribution.length === 0 ||
    !Number.isFinite(totalAdjustedValue) ||
    totalAdjustedValue <= 0
  ) {
    throw new Error('Invalid cumulative distribution generated.')
  }

  // 3. Select numbers using the CDF
  const selectedNumbers = new Set<number>()
  // Limit iterations to prevent potential infinite loops with bad data or logic.
  // Allows roughly 10 attempts per number needed, which should be ample.
  let maxIterations = count * 10

  while (selectedNumbers.size < count && maxIterations > 0) {
    // Generate a random value within the total adjusted range
    const rand = Math.random() * totalAdjustedValue

    // Find the first number in the CDF whose cumulative value is greater than the random value
    // This selects numbers proportionally to their adjustedValue.
    // `find` works well here; binary search is only needed for very large distributions.
    const selected = cumulativeDistribution.find(
      (item) => rand < item.cumulative
    )?.number

    if (selected !== undefined && !selectedNumbers.has(selected)) {
      selectedNumbers.add(selected)
    }
    // Only decrement iterations if a selection attempt was made (selected might be undefined if rand is exactly totalAdjustedValue, though unlikely)
    maxIterations--
  }

  // 4. Handle incomplete selection (fallback)
  if (selectedNumbers.size < count) {
    console.warn(
      `Could only select ${selectedNumbers.size}/${count} unique numbers using weighted stats after ${count * 10} attempts. Filling the remainder randomly.`
    )
    const remainingCount = count - selectedNumbers.size
    // Generate more random numbers than needed to increase chances of finding unique ones
    const randomFillCandidates = generateRandomNumbers(count, min, max) // Generate enough candidates

    for (const num of randomFillCandidates) {
      if (selectedNumbers.size < count && !selectedNumbers.has(num)) {
        selectedNumbers.add(num)
      }
      if (selectedNumbers.size === count) break // Stop once filled
    }

    // If still not enough (highly unlikely but possible if range is small), throw error
    if (selectedNumbers.size < count) {
      throw new Error(
        `Failed to fill remaining ${remainingCount} numbers randomly.`
      )
    }
  }

  // Return the selected numbers, sorted
  return Array.from(selectedNumbers).sort((a, b) => a - b)
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
    const j = Math.floor(Math.random() * (i + 1))
    // Swap the element at index i with the element at the random index j
    ;[numbers[i], numbers[j]] = [numbers[j], numbers[i]]
  }

  // Take the first 'count' numbers from the shuffled array (these are now random)
  // and sort them in ascending order before returning.
  return numbers.slice(0, count).sort((a, b) => a - b)
}
