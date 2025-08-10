/**
 * Seeded pseudo-random number generator using the mulberry32 algorithm.
 * Provides deterministic random number generation for reproducible results.
 */

/**
 * Simple hash function to convert string seeds to numbers
 */
function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32-bit signed integer
  }
  // Return as unsigned 32-bit to avoid negative values and edge cases
  return hash >>> 0
}

/**
 * Mulberry32 PRNG - Simple, fast, and high-quality seeded random number generator
 */
export class SeededRNG {
  private state: number

  constructor(seed: string | number) {
    this.state = typeof seed === 'string' ? hashSeed(seed) : seed
    // Ensure the seed is non-zero
    if (this.state === 0) {
      this.state = 1
    }
  }

  /**
   * Generate next random float in range [0, 1)
   */
  nextFloat(): number {
    this.state |= 0
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = Math.imul(this.state ^ (this.state >>> 15), this.state | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }

  /**
   * Generate random integer in range [0, maxExclusive)
   */
  nextInt(maxExclusive: number): number {
    if (maxExclusive <= 0) return 0
    return Math.floor(this.nextFloat() * maxExclusive)
  }
}

/**
 * Generate seeded random numbers using Fisher-Yates shuffle
 */
export function generateSeededRandomNumbers(
  count: number,
  min: number,
  max: number,
  seed: string
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

  const rng = new SeededRNG(seed)

  // Create an array containing all numbers in the specified range
  const numbers: number[] = Array.from({ length: rangeSize }, (_, i) => min + i)

  // Shuffle the array using Fisher-Yates algorithm with seeded RNG
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1)
    ;[numbers[i], numbers[j]] = [numbers[j], numbers[i]]
  }

  // Take the first 'count' numbers and sort them
  return numbers.slice(0, count).sort((a, b) => a - b)
}
