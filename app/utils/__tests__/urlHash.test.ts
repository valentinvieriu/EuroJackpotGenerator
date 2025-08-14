import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  parseUrlHash,
  formatTicketType,
  parseTicketType,
  generateLuckyCode,
  seedToLuckyCode,
  encodeAppConfigToHash,
  decodeUrlHash,
  getAppConfigUrl,
  updateBrowserUrl,
  copyConfigUrl,
  type AppConfig,
} from '../urlHash'
import { validateAppConfig } from '~/schemas/urlConfig'

// Mock window.location for URL-related tests
const mockLocation = {
  origin: 'http://localhost:3000',
  pathname: '/',
  hash: '',
}

// Mock window object
Object.defineProperty(global, 'window', {
  value: {
    location: mockLocation,
    history: {
      replaceState: vi.fn(),
    },
  },
  writable: true,
})

// Mock navigator.clipboard
Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: {
      writeText: vi.fn(),
    },
  },
  writable: true,
})

describe('Enhanced URL Hash Utilities', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    mockLocation.hash = ''
  })

  describe('Lucky Code Generation and Validation', () => {
    it('should generate lucky codes in correct format', () => {
      const luckyCode = generateLuckyCode()

      // Should match pattern: adjective-noun-number
      expect(luckyCode).toMatch(/^[a-z]+-[a-z]+-\d{1,3}$/)

      // Should contain exactly 2 hyphens
      expect((luckyCode.match(/-/g) || []).length).toBe(2)

      // Should end with a number between 1-999
      const numberPart = luckyCode.split('-')[2]
      const num = Number.parseInt(numberPart)
      expect(num).toBeGreaterThanOrEqual(1)
      expect(num).toBeLessThanOrEqual(999)
    })

    it('should convert seed to deterministic lucky code', () => {
      const seed1 = 'test-seed-123'
      const seed2 = 'different-seed'

      // Same seed should produce same lucky code
      expect(seedToLuckyCode(seed1)).toBe(seedToLuckyCode(seed1))

      // Different seeds should produce different lucky codes
      expect(seedToLuckyCode(seed1)).not.toBe(seedToLuckyCode(seed2))

      // Result should match lucky code format
      expect(seedToLuckyCode(seed1)).toMatch(/^[a-z]+-[a-z]+-\d{1,3}$/)
    })

    it('should validate lucky code format strictly', () => {
      // These would have caused the original bug
      const invalidLuckyHashes = [
        '#system=5x2&tickets=1&method=random&lucky=ABC123', // Old 6-char format
        '#system=5x2&tickets=1&method=random&lucky=INVALID-FORMAT',
        '#system=5x2&tickets=1&method=random&lucky=test_code_123',
        '#system=5x2&tickets=1&method=random&lucky=test-code-1000',
        '#system=5x2&tickets=1&method=random&lucky=test--code-123',
      ]

      invalidLuckyHashes.forEach((hash) => {
        // decodeUrlHash only extracts parameters, doesn't validate lucky code format
        const result = decodeUrlHash(hash)

        if (result) {
          // The real validation happens when we validate the config
          const validationResult = validateAppConfig(result)
          expect(validationResult).toBeNull() // Should fail validation
        }
      })
    })

    it('should accept valid lucky codes', () => {
      const validHashes = [
        '#system=5x2&tickets=1&method=random&lucky=sunset-beach-87',
        '#system=6x3&tickets=10&method=weighted&lucky=magic-star-456',
        '#system=7x2&tickets=5&method=random&lucky=golden-crown-1',
      ]

      validHashes.forEach((hash) => {
        const result = decodeUrlHash(hash)
        expect(result).toBeTruthy()
        expect(result?.lucky).toBeDefined()
      })
    })
  })

  describe('URL Hash Encoding/Decoding', () => {
    it('should encode complete app config correctly', () => {
      const config: AppConfig = {
        system: '5x2',
        tickets: 10,
        method: 'weighted',
        lucky: 'sunset-beach-87',
      }

      const hash = encodeAppConfigToHash(config)
      expect(hash).toBe(
        'system=5x2&tickets=10&method=weighted&lucky=sunset-beach-87'
      )
    })

    it('should return empty string for invalid config - this catches the original bug', () => {
      const configWithOldLuckyFormat = {
        system: '5x2',
        tickets: 1,
        method: 'random',
        lucky: 'ABC123', // Old format that caused the bug
      }

      const hash = encodeAppConfigToHash(configWithOldLuckyFormat as any)
      // This test would have caught the original bug - should return empty string for invalid lucky code
      expect(hash).toBe('')
    })

    it('should handle round-trip encoding/decoding', () => {
      const originalConfig: AppConfig = {
        system: '6x3',
        tickets: 25,
        method: 'weighted',
        lucky: 'magic-star-456',
      }

      const encoded = encodeAppConfigToHash(originalConfig)
      const decoded = decodeUrlHash('#' + encoded)

      expect(decoded).toEqual(originalConfig)
    })
  })

  describe('parseUrlHash', () => {
    it('should parse modern format URLs with correct lucky code format', () => {
      const hash =
        '#system=6x3&tickets=25&method=weighted&lucky=sunset-beach-87'
      const result = parseUrlHash(hash)

      expect(result).toEqual({
        system: '6x3',
        tickets: 25,
        method: 'weighted',
        lucky: 'sunset-beach-87',
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

  describe('URL Generation and Browser Integration', () => {
    it('should generate complete URL with config', () => {
      const config: AppConfig = {
        system: '5x2',
        tickets: 5,
        method: 'random',
        lucky: 'golden-crown-123',
      }

      const url = getAppConfigUrl(config)
      expect(url).toBe(
        'http://localhost:3000/#system=5x2&tickets=5&method=random&lucky=golden-crown-123'
      )
    })

    it('should update browser URL with config', () => {
      const config: AppConfig = {
        system: '5x2',
        tickets: 10,
        method: 'random',
      }

      updateBrowserUrl(config)

      expect(window.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        'http://localhost:3000/#system=5x2&tickets=10&method=random'
      )
    })

    it('should clear URL for null config', () => {
      updateBrowserUrl(null)

      expect(window.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        'http://localhost:3000/'
      )
    })

    it('should copy config URL to clipboard', async () => {
      const config: AppConfig = {
        system: '5x2',
        tickets: 3,
        method: 'weighted',
        lucky: 'test-lucky-456',
      }

      await copyConfigUrl(config)

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'http://localhost:3000/#system=5x2&tickets=3&method=weighted&lucky=test-lucky-456'
      )
    })
  })

  describe('Comprehensive Bug Prevention Tests', () => {
    it('should prevent the original lucky code validation bug', () => {
      // This is the specific test that would have caught the original bug
      const oldFormatConfig = {
        system: '5x2',
        tickets: 1,
        method: 'random',
        lucky: 'ABC123', // 6-char uppercase format that broke sharing
      }

      // Encoding should fail for invalid lucky code format
      const hash = encodeAppConfigToHash(oldFormatConfig as any)
      expect(hash).toBe('') // Should return empty string, not a valid hash

      // URL generation should result in just # with no parameters
      const url = getAppConfigUrl(oldFormatConfig as any)
      expect(url).toBe('http://localhost:3000/#')
    })

    it('should ensure new format always works', () => {
      const newFormatConfig: AppConfig = {
        system: '5x2',
        tickets: 1,
        method: 'random',
        lucky: 'sunset-beach-87', // Correct adjective-noun-number format
      }

      // Encoding should succeed
      const hash = encodeAppConfigToHash(newFormatConfig)
      expect(hash).toBe(
        'system=5x2&tickets=1&method=random&lucky=sunset-beach-87'
      )

      // URL generation should work
      const url = getAppConfigUrl(newFormatConfig)
      expect(url).toBe(
        'http://localhost:3000/#system=5x2&tickets=1&method=random&lucky=sunset-beach-87'
      )

      // Decoding should work
      const decoded = decodeUrlHash('#' + hash)
      expect(decoded).toEqual(newFormatConfig)
    })

    it('should validate all parts of lucky code format', () => {
      const testCases = [
        {
          code: 'sunset-beach-87',
          valid: true,
          description: 'Valid standard format',
        },
        {
          code: 'magic-star-1',
          valid: true,
          description: 'Valid with single digit',
        },
        {
          code: 'golden-crown-999',
          valid: true,
          description: 'Valid with max number',
        },
        { code: 'ABC123', valid: false, description: 'Old 6-char uppercase' },
        {
          code: 'sunset_beach_87',
          valid: false,
          description: 'Underscores instead of hyphens',
        },
        {
          code: 'Sunset-Beach-87',
          valid: false,
          description: 'Capital letters',
        },
        {
          code: 'sunset-beach-1000',
          valid: false,
          description: 'Number too large',
        },
        {
          code: 'sunset--beach-87',
          valid: false,
          description: 'Double hyphen',
        },
        { code: 'sunset-beach-', valid: false, description: 'Missing number' },
        { code: 'sunset-87', valid: false, description: 'Missing noun part' },
        { code: '-beach-87', valid: false, description: 'Missing adjective' },
      ]

      testCases.forEach(({ code, valid }) => {
        const hash = `#system=5x2&tickets=1&method=random&lucky=${code}`
        const result = decodeUrlHash(hash)

        if (valid) {
          expect(result).toBeTruthy()
          expect(result?.lucky).toBe(code)
          // Also test that validation passes
          const validationResult = validateAppConfig(result)
          expect(validationResult).toBeTruthy()
        } else {
          // decodeUrlHash extracts but doesn't validate format
          expect(result).toBeTruthy() // Should decode successfully
          expect(result?.lucky).toBe(code)
          // But validation should fail
          const validationResult = validateAppConfig(result)
          expect(validationResult).toBeNull()
        }
      })
    })
  })
})
