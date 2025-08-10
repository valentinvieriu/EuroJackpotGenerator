import { describe, it, expect } from 'vitest'
import { generateRandomNumbers, generateNumbers } from '../numberGenerator'

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
})
