/**
 * Seeded pseudo-random number generator for the simulation engine (sfc32).
 *
 * Fast and reproducible, with 128 bits of state so that runs of millions of
 * draws stay far away from the generator's period. It is predictable by
 * design: anything that must not be guessable uses `rng.ts` instead.
 */

import { randomInt } from './rng'

const UINT32_RANGE = 0x100000000
const HALF_BITS = 16
const HALF_RANGE = 0x10000
const HALF_MASK = 0xffff
const WARM_UP_ROUNDS = 15

/**
 * Spread a seed string over four 32-bit words (cyrb128), so that seeds
 * differing by one character start the generator in unrelated states.
 */
function hashSeed(seed: string): [number, number, number, number] {
  let h1 = 1779033703
  let h2 = 3144134277
  let h3 = 1013904242
  let h4 = 2773480762
  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  h1 ^= h2 ^ h3 ^ h4
  h2 ^= h1
  h3 ^= h1
  h4 ^= h1
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0]
}

export class Sfc32 {
  private a: number
  private b: number
  private c: number
  private d: number

  constructor(seed: string) {
    const [a, b, c, d] = hashSeed(seed)
    this.a = a | 0
    this.b = b | 0
    this.c = c | 0
    this.d = d | 0
    // The first outputs still carry traces of the seed
    for (let i = 0; i < WARM_UP_ROUNDS; i++) this.nextUint32()
  }

  /** Next value in [0, 2^32) */
  nextUint32(): number {
    const t = (((this.a + this.b) | 0) + this.d) | 0
    this.d = (this.d + 1) | 0
    this.a = this.b ^ (this.b >>> 9)
    this.b = (this.c + (this.c << 3)) | 0
    this.c = (this.c << 21) | (this.c >>> 11)
    this.c = (this.c + t) | 0
    return t >>> 0
  }

  /**
   * Uniform integer in [0, maxExclusive), for maxExclusive up to 2^16.
   *
   * Lemire's method on the top 16 bits: multiply, keep the high half, and
   * redraw for the few low halves that would favour some results. Stays in
   * small-integer arithmetic, which matters at seven calls per draw.
   */
  below(maxExclusive: number): number {
    const threshold = HALF_RANGE % maxExclusive
    let product = (this.nextUint32() >>> HALF_BITS) * maxExclusive
    while ((product & HALF_MASK) < threshold) {
      product = (this.nextUint32() >>> HALF_BITS) * maxExclusive
    }
    return product >>> HALF_BITS
  }
}

/** A fresh, unpredictable seed for a run nobody asked to replay */
export function randomSeed(): string {
  return (
    randomInt(UINT32_RANGE).toString(36) + randomInt(UINT32_RANGE).toString(36)
  )
}
