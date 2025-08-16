import { describe, it, expect } from 'vitest'
import {
  generateRandomNumbers,
  generateNumbers,
  generateNumbersWithFavorites,
} from '../numberGenerator'

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
})
