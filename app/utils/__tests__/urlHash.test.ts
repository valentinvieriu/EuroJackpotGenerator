import { describe, it, expect } from 'vitest'
import { parseUrlHash, formatTicketType, parseTicketType } from '../urlHash'

describe('Enhanced URL Hash Utilities', () => {
  describe('parseUrlHash', () => {
    it('should parse modern format URLs', () => {
      const hash = '#system=6x3&tickets=25&method=weighted&lucky=ABC123'
      const result = parseUrlHash(hash)

      expect(result).toEqual({
        system: '6x3',
        tickets: 25,
        method: 'weighted',
        lucky: 'ABC123',
      })
    })

    it('should parse modern format without lucky code', () => {
      const hash = '#system=5x2&tickets=10&method=random'
      const result = parseUrlHash(hash)

      expect(result).toEqual({
        system: '5x2',
        tickets: 10,
        method: 'random',
      })
    })

    it('should handle legacy format URLs', () => {
      const hash = '#seed=legacy-seed&type=7x4&count=15&method=weighted'
      const result = parseUrlHash(hash)

      expect(result).toBeTruthy()
      expect(result?.system).toBe('7x4')
      expect(result?.tickets).toBe(15)
      expect(result?.method).toBe('weighted')
      // Lucky code should be generated from seed
      expect(result?.lucky).toBeTruthy()
    })

    it('should return null for empty hash', () => {
      const result = parseUrlHash('')
      expect(result).toBeNull()
    })

    it('should return null for invalid hash', () => {
      const result = parseUrlHash('#invalid=params')
      expect(result).toBeNull()
    })

    it('should handle hash with # prefix', () => {
      const hash = '#system=5x2&tickets=5'
      const result = parseUrlHash(hash)

      expect(result).toBeTruthy()
      expect(result?.system).toBe('5x2')
    })

    it('should handle hash without # prefix', () => {
      const hash = 'system=5x2&tickets=5'
      const result = parseUrlHash(hash)

      expect(result).toBeTruthy()
      expect(result?.system).toBe('5x2')
    })
  })

  describe('backwards compatibility', () => {
    it('should convert legacy seed to lucky code deterministically', () => {
      const hash1 = '#seed=test-seed&type=5x2&count=10'
      const hash2 = '#seed=test-seed&type=5x2&count=10'

      const result1 = parseUrlHash(hash1)
      const result2 = parseUrlHash(hash2)

      expect(result1?.lucky).toBe(result2?.lucky)
    })

    it('should prioritize modern format over legacy', () => {
      // URL with both modern and legacy parameters
      const hash = '#system=6x2&tickets=20&seed=legacy&type=5x2&count=10'
      const result = parseUrlHash(hash)

      // Should use modern format values
      expect(result?.system).toBe('6x2')
      expect(result?.tickets).toBe(20)
    })
  })

  describe('parseTicketType', () => {
    it('should parse valid ticket type strings', () => {
      const result = parseTicketType('8x5')
      expect(result).toEqual({
        mainCount: 8,
        euroCount: 5,
      })
    })

    it('should return null for invalid format', () => {
      expect(parseTicketType('invalid')).toBeNull()
      expect(parseTicketType('')).toBeNull()
      expect(parseTicketType('5')).toBeNull()
    })
  })

  describe('formatTicketType', () => {
    it('should format ticket type correctly', () => {
      const result = formatTicketType(9, 6)
      expect(result).toBe('9x6')
    })
  })

  describe('validation edge cases', () => {
    it('should handle malformed URLs gracefully', () => {
      const malformedHashes = [
        '#system=&tickets=',
        '#system=5x&tickets=abc',
        '#tickets=999&method=invalid',
        '#system=100x100&tickets=10000',
      ]

      malformedHashes.forEach((hash) => {
        const result = parseUrlHash(hash)
        // Should not crash, might return null or partial valid config
        expect(typeof result === 'object' || result === null).toBe(true)
      })
    })

    it('should validate ticket count ranges', () => {
      const hash = '#system=5x2&tickets=1000&method=random'
      const result = parseUrlHash(hash)

      // Should either reject invalid count or apply validation
      if (result) {
        expect(result.tickets).toBeLessThanOrEqual(500)
      }
    })
  })
})
