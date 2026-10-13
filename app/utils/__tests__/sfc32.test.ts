import { describe, it, expect } from 'vitest'
import { Sfc32, randomSeed } from '../sfc32'

const take = (rng: Sfc32, count: number) =>
  Array.from({ length: count }, () => rng.nextUint32())

describe('Sfc32', () => {
  it('repeats the same sequence for the same seed', () => {
    expect(take(new Sfc32('lucky-seed'), 20)).toEqual(
      take(new Sfc32('lucky-seed'), 20)
    )
  })

  it('gives unrelated sequences for seeds that differ by one character', () => {
    const a = take(new Sfc32('seed-1'), 20)
    const b = take(new Sfc32('seed-2'), 20)
    expect(a.filter((value, i) => value === b[i])).toHaveLength(0)
  })

  it('produces unsigned 32-bit integers', () => {
    for (const value of take(new Sfc32('range'), 1000)) {
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(0x100000000)
    }
  })

  it('below() stays in range and spreads evenly', () => {
    const rng = new Sfc32('uniform')
    const sides = 50
    const rolls = 500_000
    const counts = Array.from({ length: sides }, () => 0)
    let outOfRange = 0
    for (let i = 0; i < rolls; i++) {
      const value = rng.below(sides)
      if (!Number.isInteger(value) || value < 0 || value >= sides) outOfRange++
      else counts[value]!++
    }
    expect(outOfRange).toBe(0)

    // Each side is expected 10,000 times with a standard deviation of ~99
    const expected = rolls / sides
    for (const count of counts) {
      expect(Math.abs(count - expected)).toBeLessThan(500)
    }
  })

  it('below(1) is always 0', () => {
    const rng = new Sfc32('one')
    for (let i = 0; i < 100; i++) expect(rng.below(1)).toBe(0)
  })
})

describe('randomSeed', () => {
  it('returns a different non-empty string each time', () => {
    const seeds = new Set(Array.from({ length: 50 }, () => randomSeed()))
    expect(seeds.size).toBe(50)
    for (const seed of seeds) expect(seed).toMatch(/^[0-9a-z]+$/)
  })
})
