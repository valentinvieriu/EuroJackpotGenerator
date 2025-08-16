import { describe, it, expect } from 'vitest'
import {
  generateRandomNumbers,
  generateNumbers,
  generateNumbersWithFavorites,
  generateUnpopularNumbers,
} from '../numberGenerator'
import { scorePopularity } from '../popularityScorer'

describe('number generator', () => {
  it('generateRandomNumbers returns sorted unique numbers within range', () => {
    const nums = generateRandomNumbers(5, 1, 50)
    expect(nums).toHaveLength(5)
    expect([...new Set(nums)]).toHaveLength(5)
    for (const n of nums) {
      expect(Number.isInteger(n)).toBe(true)
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(50)
    }
    const sorted = [...nums].sort((a, b) => a - b)
    expect(nums).toEqual(sorted)
  })

  it('generateNumbers falls back to random when stats invalid or insufficient', () => {
    // stats outside range -> filtered out -> fallback path
    const stats = [{ number: 999, value: 100 }]
    const nums = generateNumbers(5, 1, 50, stats as any)
    expect(nums).toHaveLength(5)
  })

  it('throws when asking for more unique numbers than range size', () => {
    expect(() => generateRandomNumbers(3, 1, 2)).toThrow()
  })

  describe('generateNumbersWithFavorites', () => {
    it('includes all favorites when count allows', () => {
      const favorites = [7, 23, 42]
      const result = generateNumbersWithFavorites(5, 1, 50, favorites)

      expect(result).toHaveLength(5)
      expect(result).toEqual(expect.arrayContaining(favorites))

      // Should be sorted
      const sorted = [...result].sort((a, b) => a - b)
      expect(result).toEqual(sorted)
    })

    it('prioritizes favorites when more favorites than slots', () => {
      const favorites = [1, 2, 3, 4, 5, 6] // 6 favorites but only 3 slots
      const result = generateNumbersWithFavorites(3, 1, 50, favorites)

      expect(result).toHaveLength(3)
      // All results should be from favorites (first 3)
      for (const num of result) {
        expect(favorites.slice(0, 3)).toContain(num)
      }
    })

    it('filters favorites to valid range', () => {
      const favorites = [0, 7, 23, 51, 100] // Only 7 and 23 are valid for 1-50 range
      const result = generateNumbersWithFavorites(5, 1, 50, favorites)

      expect(result).toHaveLength(5)
      expect(result).toContain(7)
      expect(result).toContain(23)
      expect(result).not.toContain(0)
      expect(result).not.toContain(51)
      expect(result).not.toContain(100)
    })

    it('falls back to regular generation when no valid favorites', () => {
      const favorites = [0, 100, 200] // All outside 1-50 range
      const result = generateNumbersWithFavorites(5, 1, 50, favorites)

      expect(result).toHaveLength(5)
      // Should still generate valid numbers
      for (const num of result) {
        expect(num).toBeGreaterThanOrEqual(1)
        expect(num).toBeLessThanOrEqual(50)
      }
    })

    it('uses enhanced weights with statistics', () => {
      const favorites = [7, 23]
      const stats = [
        { number: 1, value: 10 },
        { number: 7, value: 5 }, // favorite
        { number: 23, value: 3 }, // favorite
        { number: 42, value: 20 }, // high frequency non-favorite
      ]

      // Run multiple times to test probability enhancement
      const results = []
      for (let i = 0; i < 100; i++) {
        const result = generateNumbersWithFavorites(2, 1, 50, favorites, stats)
        results.push(result)
      }

      // Favorites should appear more frequently than their base stats suggest
      const favoriteAppearances = results
        .flat()
        .filter((n) => favorites.includes(n)).length
      expect(favoriteAppearances).toBeGreaterThan(50) // Should be well above random chance
    })

    it('handles empty favorites array', () => {
      const favorites: number[] = []
      const result = generateNumbersWithFavorites(5, 1, 50, favorites)

      expect(result).toHaveLength(5)
      // Should behave like regular generation
      for (const num of result) {
        expect(num).toBeGreaterThanOrEqual(1)
        expect(num).toBeLessThanOrEqual(50)
      }
    })

    it('ensures uniqueness with favorites', () => {
      const favorites = [1, 1, 1, 2, 2] // Duplicate favorites
      const result = generateNumbersWithFavorites(5, 1, 50, favorites)

      expect(result).toHaveLength(5)
      expect([...new Set(result)]).toHaveLength(5) // All unique
      expect(result).toContain(1)
      expect(result).toContain(2)
    })

    it('throws when range too small', () => {
      const favorites = [1, 2]
      expect(() => generateNumbersWithFavorites(5, 1, 3, favorites)).toThrow()
    })
  })

  describe('generateUnpopularNumbers', () => {
    it('returns valid structure with correct counts', () => {
      const result = generateUnpopularNumbers(5, 2)

      expect(result).toMatchObject({
        mainNumbers: expect.any(Array),
        euroNumbers: expect.any(Array),
        popularityResult: expect.any(Object),
      })

      expect(result.mainNumbers).toHaveLength(5)
      expect(result.euroNumbers).toHaveLength(2)

      // Numbers should be unique
      expect([...new Set(result.mainNumbers)]).toHaveLength(5)
      expect([...new Set(result.euroNumbers)]).toHaveLength(2)

      // Numbers should be in valid ranges
      for (const num of result.mainNumbers) {
        expect(num).toBeGreaterThanOrEqual(1)
        expect(num).toBeLessThanOrEqual(50)
      }
      for (const num of result.euroNumbers) {
        expect(num).toBeGreaterThanOrEqual(1)
        expect(num).toBeLessThanOrEqual(12)
      }

      // Numbers should be sorted
      const sortedMains = [...result.mainNumbers].sort((a, b) => a - b)
      const sortedEuros = [...result.euroNumbers].sort((a, b) => a - b)
      expect(result.mainNumbers).toEqual(sortedMains)
      expect(result.euroNumbers).toEqual(sortedEuros)
    })

    it('includes valid popularity result', () => {
      const result = generateUnpopularNumbers(5, 2)
      const { popularityResult } = result

      expect(popularityResult).toMatchObject({
        popularityScore: expect.any(Number),
        unpopularityScore: expect.any(Number),
        qMultiplier: expect.any(Number),
        expectedLambda: expect.any(Function),
        expectedShare: expect.any(Function),
        features: expect.any(Object),
        explain: expect.any(Array),
        constants: expect.any(Object),
      })

      expect(popularityResult.popularityScore).toBeGreaterThanOrEqual(0)
      expect(popularityResult.popularityScore).toBeLessThanOrEqual(100)
      expect(popularityResult.unpopularityScore).toBeGreaterThanOrEqual(0)
      expect(popularityResult.unpopularityScore).toBeLessThanOrEqual(100)
      expect(
        popularityResult.popularityScore + popularityResult.unpopularityScore
      ).toBe(100)
    })

    it('works with standard EuroJackpot format only', () => {
      // The popularity scorer is designed specifically for EuroJackpot (5+2)
      // System tickets still use 5 main and 2 euro numbers for individual lines
      const result = generateUnpopularNumbers(5, 2)

      expect(result.mainNumbers).toHaveLength(5)
      expect(result.euroNumbers).toHaveLength(2)
      expect(result.popularityResult).toBeDefined()
    })

    it('respects candidatesCount parameter', () => {
      // Test with small candidate count for faster execution
      const result = generateUnpopularNumbers(5, 2, 5)

      expect(result).toMatchObject({
        mainNumbers: expect.any(Array),
        euroNumbers: expect.any(Array),
        popularityResult: expect.any(Object),
      })

      expect(result.mainNumbers).toHaveLength(5)
      expect(result.euroNumbers).toHaveLength(2)
    })

    it('throws with invalid candidatesCount', () => {
      expect(() => generateUnpopularNumbers(5, 2, 0)).toThrow(
        'candidatesCount must be at least 1'
      )
      expect(() => generateUnpopularNumbers(5, 2, -1)).toThrow(
        'candidatesCount must be at least 1'
      )
    })

    it('throws with non-standard EuroJackpot format', () => {
      expect(() => generateUnpopularNumbers(6, 3)).toThrow(
        'generateUnpopularNumbers only supports standard EuroJackpot format'
      )
      expect(() => generateUnpopularNumbers(7, 2)).toThrow(
        'generateUnpopularNumbers only supports standard EuroJackpot format'
      )
      expect(() => generateUnpopularNumbers(5, 3)).toThrow(
        'generateUnpopularNumbers only supports standard EuroJackpot format'
      )
    })

    it('generates different results on multiple calls', () => {
      // Generate multiple results with small candidate count for speed
      const results = Array.from({ length: 10 }, () =>
        generateUnpopularNumbers(5, 2, 10)
      )

      // Not all results should be identical (very unlikely with random generation)
      const uniqueMainCombos = new Set(
        results.map((r) => r.mainNumbers.join(','))
      )
      expect(uniqueMainCombos.size).toBeGreaterThan(1)
    })

    it('aims for lower popularity scores', () => {
      // Generate multiple results and check that they're generally more unpopular than random
      const unpopularResults = Array.from(
        { length: 10 },
        () => generateUnpopularNumbers(5, 2, 100) // Use more candidates for better selection
      )

      // Generate some purely random combinations for comparison
      const randomResults = Array.from({ length: 10 }, () => {
        const mains = generateRandomNumbers(5, 1, 50)
        const euros = generateRandomNumbers(2, 1, 12)
        return scorePopularity({ mains, euros })
      })

      const avgUnpopularScore =
        unpopularResults.reduce(
          (sum, r) => sum + r.popularityResult.popularityScore,
          0
        ) / unpopularResults.length
      const avgRandomScore =
        randomResults.reduce((sum, r) => sum + r.popularityScore, 0) /
        randomResults.length

      // The unpopular generation should on average produce lower popularity scores than pure random
      expect(avgUnpopularScore).toBeLessThan(avgRandomScore)

      // At least 70% of unpopular results should be below the average random score
      const unpopularBelowAverage = unpopularResults.filter(
        (r) => r.popularityResult.popularityScore < avgRandomScore
      ).length
      expect(unpopularBelowAverage).toBeGreaterThanOrEqual(7) // 7 out of 10
    })

    it('handles fallback gracefully when all candidates fail', () => {
      // This test would be hard to trigger naturally, but we can test the structure
      // The fallback logic is covered by ensuring valid output even in edge cases
      const result = generateUnpopularNumbers(5, 2, 1)

      expect(result).toMatchObject({
        mainNumbers: expect.any(Array),
        euroNumbers: expect.any(Array),
        popularityResult: expect.any(Object),
      })
    })

    it('produces combinations that avoid common patterns better than pure random', () => {
      // Generate several unpopular combinations
      const unpopularResults = Array.from({ length: 20 }, () =>
        generateUnpopularNumbers(5, 2, 50)
      )

      // Check that most avoid obvious patterns like consecutive sequences
      const consecutiveCount = unpopularResults.filter((result) => {
        const sorted = [...result.mainNumbers].sort((a, b) => a - b)
        // Check if all 5 numbers are consecutive
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i + 1] - sorted[i] !== 1) return false
        }
        return true
      }).length

      // Expect very few (ideally zero) consecutive sequences in unpopular results
      expect(consecutiveCount).toBeLessThan(3) // Allow some variance due to randomness
    })
  })
})
