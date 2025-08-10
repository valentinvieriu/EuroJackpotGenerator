import { describe, it, expect } from 'vitest'
import { SeededRNG, generateSeededRandomNumbers } from '../seededRng'

describe('SeededRNG', () => {
  describe('constructor', () => {
    it('should accept string seed', () => {
      const rng = new SeededRNG('test123')
      expect(rng).toBeInstanceOf(SeededRNG)
    })

    it('should accept numeric seed', () => {
      const rng = new SeededRNG(12345)
      expect(rng).toBeInstanceOf(SeededRNG)
    })

    it('should handle zero seed by converting to 1', () => {
      const rng = new SeededRNG(0)
      const value = rng.nextFloat()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    })

    it('should produce same initial state for same string seed', () => {
      const rng1 = new SeededRNG('identical')
      const rng2 = new SeededRNG('identical')

      expect(rng1.nextFloat()).toBe(rng2.nextFloat())
    })
  })

  describe('nextFloat', () => {
    it('should generate values in range [0, 1)', () => {
      const rng = new SeededRNG('test')

      for (let i = 0; i < 1000; i++) {
        const value = rng.nextFloat()
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(1)
      }
    })

    it('should generate deterministic sequence', () => {
      const rng1 = new SeededRNG('deterministic')
      const rng2 = new SeededRNG('deterministic')

      const sequence1 = Array.from({ length: 10 }, () => rng1.nextFloat())
      const sequence2 = Array.from({ length: 10 }, () => rng2.nextFloat())

      expect(sequence1).toEqual(sequence2)
    })

    it('should generate different sequences for different seeds', () => {
      const rng1 = new SeededRNG('seed1')
      const rng2 = new SeededRNG('seed2')

      const sequence1 = Array.from({ length: 10 }, () => rng1.nextFloat())
      const sequence2 = Array.from({ length: 10 }, () => rng2.nextFloat())

      expect(sequence1).not.toEqual(sequence2)
    })

    it('should have good distribution properties', () => {
      const rng = new SeededRNG('distribution-test')
      const values = Array.from({ length: 10000 }, () => rng.nextFloat())

      // Check mean is approximately 0.5
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length
      expect(mean).toBeGreaterThan(0.45)
      expect(mean).toBeLessThan(0.55)

      // Check values are spread across the range
      const bins = Array(10).fill(0)
      values.forEach((v) => {
        const bin = Math.floor(v * 10)
        bins[Math.min(bin, 9)]++
      })

      // Each bin should have at least some values (no bin completely empty)
      bins.forEach((count) => {
        expect(count).toBeGreaterThan(100) // At least 1% in each bin
      })
    })
  })

  describe('nextInt', () => {
    it('should generate values in range [0, maxExclusive)', () => {
      const rng = new SeededRNG('int-test')

      for (let max = 1; max <= 100; max++) {
        for (let i = 0; i < 100; i++) {
          const value = rng.nextInt(max)
          expect(value).toBeGreaterThanOrEqual(0)
          expect(value).toBeLessThan(max)
          expect(Number.isInteger(value)).toBe(true)
        }
      }
    })

    it('should return 0 for maxExclusive <= 0', () => {
      const rng = new SeededRNG('edge-case')
      expect(rng.nextInt(0)).toBe(0)
      expect(rng.nextInt(-5)).toBe(0)
    })

    it('should generate deterministic integer sequence', () => {
      const rng1 = new SeededRNG('int-deterministic')
      const rng2 = new SeededRNG('int-deterministic')

      const sequence1 = Array.from({ length: 20 }, () => rng1.nextInt(100))
      const sequence2 = Array.from({ length: 20 }, () => rng2.nextInt(100))

      expect(sequence1).toEqual(sequence2)
    })
  })
})

describe('generateSeededRandomNumbers', () => {
  it('should generate the requested count of numbers', () => {
    const numbers = generateSeededRandomNumbers(5, 1, 50, 'count-test')
    expect(numbers).toHaveLength(5)
  })

  it('should generate numbers within the specified range', () => {
    const numbers = generateSeededRandomNumbers(10, 1, 50, 'range-test')

    numbers.forEach((num) => {
      expect(num).toBeGreaterThanOrEqual(1)
      expect(num).toBeLessThanOrEqual(50)
      expect(Number.isInteger(num)).toBe(true)
    })
  })

  it('should generate unique numbers', () => {
    const numbers = generateSeededRandomNumbers(10, 1, 50, 'unique-test')
    const uniqueNumbers = [...new Set(numbers)]
    expect(uniqueNumbers).toHaveLength(numbers.length)
  })

  it('should return sorted numbers', () => {
    const numbers = generateSeededRandomNumbers(10, 1, 50, 'sorted-test')
    const sortedNumbers = [...numbers].sort((a, b) => a - b)
    expect(numbers).toEqual(sortedNumbers)
  })

  it('should be deterministic with same seed', () => {
    const numbers1 = generateSeededRandomNumbers(5, 1, 50, 'deterministic')
    const numbers2 = generateSeededRandomNumbers(5, 1, 50, 'deterministic')
    expect(numbers1).toEqual(numbers2)
  })

  it('should produce different results with different seeds', () => {
    const numbers1 = generateSeededRandomNumbers(5, 1, 50, 'seed-a')
    const numbers2 = generateSeededRandomNumbers(5, 1, 50, 'seed-b')
    expect(numbers1).not.toEqual(numbers2)
  })

  it('should handle edge cases', () => {
    // Empty count
    expect(generateSeededRandomNumbers(0, 1, 50, 'empty')).toEqual([])

    // Single number range
    expect(generateSeededRandomNumbers(1, 42, 42, 'single')).toEqual([42])

    // Full range
    const fullRange = generateSeededRandomNumbers(5, 1, 5, 'full-range')
    expect(fullRange).toEqual([1, 2, 3, 4, 5])
  })

  it('should throw error when range is too small', () => {
    expect(() => generateSeededRandomNumbers(10, 1, 5, 'too-small')).toThrow(
      'Cannot generate 10 unique numbers from a range of size 5 (1-5)'
    )
  })

  it('should work with EuroJackpot number ranges', () => {
    // Test main numbers (1-50, pick 5)
    const mainNumbers = generateSeededRandomNumbers(5, 1, 50, 'main-test')
    expect(mainNumbers).toHaveLength(5)
    mainNumbers.forEach((num) => {
      expect(num).toBeGreaterThanOrEqual(1)
      expect(num).toBeLessThanOrEqual(50)
    })

    // Test euro numbers (1-12, pick 2)
    const euroNumbers = generateSeededRandomNumbers(2, 1, 12, 'euro-test')
    expect(euroNumbers).toHaveLength(2)
    euroNumbers.forEach((num) => {
      expect(num).toBeGreaterThanOrEqual(1)
      expect(num).toBeLessThanOrEqual(12)
    })
  })

  it('should demonstrate reproducibility across multiple calls', () => {
    const seed = 'reproducibility-test'

    // Generate numbers multiple times with same seed
    const results = Array.from({ length: 5 }, () =>
      generateSeededRandomNumbers(3, 1, 10, seed)
    )

    // All results should be identical
    results.forEach((result) => {
      expect(result).toEqual(results[0])
    })
  })

  it('should have good distribution properties', () => {
    const seed = 'distribution-analysis'
    const trials = 1000
    const numberCounts = new Map<number, number>()

    // Generate many sequences and count frequency of each number
    for (let i = 0; i < trials; i++) {
      const numbers = generateSeededRandomNumbers(2, 1, 10, `${seed}-${i}`)
      numbers.forEach((num) => {
        numberCounts.set(num, (numberCounts.get(num) || 0) + 1)
      })
    }

    // Each number from 1-10 should appear reasonably often
    for (let num = 1; num <= 10; num++) {
      const count = numberCounts.get(num) || 0
      // With 2000 total selections from 10 numbers, expect ~200 per number
      // Allow for reasonable variance
      expect(count).toBeGreaterThan(100)
      expect(count).toBeLessThan(300)
    }
  })
})
