import { describe, it, expect } from 'vitest'
import {
  getWinClassColor,
  getProgressWinClassColor,
  getResultsWinClassColor,
} from '../winClassColors'

describe('winClassColors', () => {
  describe('getWinClassColor', () => {
    it('should return correct colors for major wins (classes 1-3)', () => {
      expect(getWinClassColor(1)).toBe('text-yellow-400')
      expect(getWinClassColor(2)).toBe('text-yellow-400')
      expect(getWinClassColor(3)).toBe('text-yellow-400')
    })

    it('should return correct colors for moderate wins (classes 4-6)', () => {
      expect(getWinClassColor(4)).toBe('text-green-400')
      expect(getWinClassColor(5)).toBe('text-green-400')
      expect(getWinClassColor(6)).toBe('text-green-400')
    })

    it('should return correct colors for minor wins (classes 7-9)', () => {
      expect(getWinClassColor(7)).toBe('text-blue-400')
      expect(getWinClassColor(8)).toBe('text-blue-400')
      expect(getWinClassColor(9)).toBe('text-blue-400')
    })

    it('should return correct colors for minimal wins (classes 10-12)', () => {
      expect(getWinClassColor(10)).toBe('text-gray-300')
      expect(getWinClassColor(11)).toBe('text-gray-300')
      expect(getWinClassColor(12)).toBe('text-gray-300')
    })

    it('should return gray when hasWins is false', () => {
      expect(getWinClassColor(1, false)).toBe('text-gray-500')
      expect(getWinClassColor(5, false)).toBe('text-gray-500')
      expect(getWinClassColor(9, false)).toBe('text-gray-500')
    })
  })

  describe('getProgressWinClassColor', () => {
    it('should return correct color when class has wins', () => {
      const winsByClass = { 1: 5, 4: 10, 7: 3 }

      expect(getProgressWinClassColor(1, winsByClass)).toBe('text-yellow-400')
      expect(getProgressWinClassColor(4, winsByClass)).toBe('text-green-400')
      expect(getProgressWinClassColor(7, winsByClass)).toBe('text-blue-400')
    })

    it('should return gray when class has no wins', () => {
      const winsByClass = { 1: 5, 4: 10 }

      expect(getProgressWinClassColor(2, winsByClass)).toBe('text-gray-500')
      expect(getProgressWinClassColor(7, winsByClass)).toBe('text-gray-500')
    })

    it('should handle zero wins', () => {
      const winsByClass = { 1: 0, 4: 10 }

      expect(getProgressWinClassColor(1, winsByClass)).toBe('text-gray-500')
      expect(getProgressWinClassColor(4, winsByClass)).toBe('text-green-400')
    })
  })

  describe('getResultsWinClassColor', () => {
    it('should return correct color when class has wins', () => {
      const winsByClass = { 2: 8, 5: 15, 8: 2 }

      expect(getResultsWinClassColor(2, winsByClass)).toBe('text-yellow-400')
      expect(getResultsWinClassColor(5, winsByClass)).toBe('text-green-400')
      expect(getResultsWinClassColor(8, winsByClass)).toBe('text-blue-400')
    })

    it('should return gray when class has no wins', () => {
      const winsByClass = { 2: 8, 5: 15 }

      expect(getResultsWinClassColor(1, winsByClass)).toBe('text-gray-500')
      expect(getResultsWinClassColor(9, winsByClass)).toBe('text-gray-500')
    })

    it('should handle zero wins explicitly', () => {
      const winsByClass = { 1: 0, 5: 15 }

      expect(getResultsWinClassColor(1, winsByClass)).toBe('text-gray-500')
      expect(getResultsWinClassColor(5, winsByClass)).toBe('text-green-400')
    })
  })

  describe('edge cases', () => {
    it('should handle invalid class numbers gracefully', () => {
      expect(getWinClassColor(0)).toBe('text-gray-300') // default case
      expect(getWinClassColor(13)).toBe('text-gray-300') // default case
      expect(getWinClassColor(-1)).toBe('text-gray-300') // default case
    })

    it('should handle empty winsByClass object', () => {
      expect(getProgressWinClassColor(1, {})).toBe('text-gray-500')
      expect(getResultsWinClassColor(1, {})).toBe('text-gray-500')
    })
  })
})
