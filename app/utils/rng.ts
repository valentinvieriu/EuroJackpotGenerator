/**
 * Cryptographically secure random number generator utilities.
 * Uses crypto.getRandomValues() when available, with Math.random() fallback.
 */

/**
 * Generates a cryptographically secure random integer in the range [0, maxExclusive).
 * Uses rejection sampling to avoid modulo bias.
 *
 * @param maxExclusive The upper bound (exclusive) for the random number.
 * @returns A random integer from 0 to maxExclusive-1 (inclusive).
 */
export function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0

  if (globalThis.crypto?.getRandomValues) {
    // Rejection sampling to avoid modulo bias
    const range = 0x100000000 // 2^32
    const bucketSize = Math.floor(range / maxExclusive)
    const limit = bucketSize * maxExclusive
    const buf = new Uint32Array(1)

    while (true) {
      globalThis.crypto.getRandomValues(buf)
      if (buf[0] < limit) return Math.floor(buf[0] / bucketSize)
    }
  }

  // Fallback to Math.random()
  return Math.floor(Math.random() * maxExclusive)
}

/**
 * Generates a cryptographically secure random float in the range [0, 1).
 *
 * @returns A random float from 0 to 1 (exclusive).
 */
export function randomFloat(): number {
  if (globalThis.crypto?.getRandomValues) {
    // Use 32-bit precision for better distribution
    const buf = new Uint32Array(1)
    globalThis.crypto.getRandomValues(buf)
    return buf[0] / 0x100000000 // Divide by 2^32
  }

  // Fallback to Math.random()
  return Math.random()
}
