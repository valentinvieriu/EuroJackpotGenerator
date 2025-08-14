import { describe, it, expect, vi } from 'vitest'
import {
  AppConfigSchema,
  LegacyConfigSchema,
  LuckyCodeSchema,
  TicketSystemSchema,
  SelectionMethodSchema,
  TicketCountSchema,
  validateAppConfig,
  validateLegacyConfig,
  validateUrlParams,
  parseTicketSystem,
  formatTicketSystem,
  type AppConfig,
} from '../urlConfig'

describe('URL Configuration Schemas', () => {
  describe('LuckyCodeSchema', () => {
    it('should validate correct lucky code format', () => {
      const validCodes = [
        'sunset-beach-87',
        'magic-star-456',
        'golden-crown-1',
        'brilliant-treasure-999',
        'a-b-1',
      ]

      validCodes.forEach((code) => {
        expect(() => LuckyCodeSchema.parse(code)).not.toThrow()
      })
    })

    it('should reject invalid lucky code formats - including the old format that caused the bug', () => {
      const invalidCodes = [
        'ABC123', // Old 6-char uppercase format that caused the original bug
        'SUNSET-BEACH-87', // Uppercase letters
        'sunset_beach_87', // Underscores instead of hyphens
        'sunset-beach-1000', // Number too large
        'sunset--beach-87', // Double hyphen
        'sunset-beach-', // Missing number
        'sunset-87', // Missing noun part
        '-beach-87', // Missing adjective
        'sunset-beach-0', // Zero not allowed
        'sunset beach 87', // Spaces
        '', // Empty string
      ]

      invalidCodes.forEach((code) => {
        expect(() => LuckyCodeSchema.parse(code)).toThrow()
      })
    })

    it('should have descriptive error message', () => {
      expect(() => LuckyCodeSchema.parse('ABC123')).toThrow()

      try {
        LuckyCodeSchema.parse('ABC123')
        fail('Should have thrown an error')
      } catch (error: any) {
        // The error structure might be different across Zod versions; be flexible
        if (
          error.errors &&
          Array.isArray(error.errors) &&
          error.errors.length
        ) {
          expect(error.errors[0].message).toBe(
            'Lucky code must be in format "adjective-noun-number"'
          )
          return
        }

        if (
          error.issues &&
          Array.isArray(error.issues) &&
          error.issues.length
        ) {
          expect(error.issues[0].message).toBe(
            'Lucky code must be in format "adjective-noun-number"'
          )
          return
        }

        if (error.message) {
          const normalized = String(error.message).replace(/\\"/g, '"')
          expect(normalized).toContain(
            'Lucky code must be in format "adjective-noun-number"'
          )
          return
        }

        // Fallback: ensure some error occurred
        expect(error).toBeDefined()
        console.log('Error structure:', JSON.stringify(error, null, 2))
      }
    })
  })

  describe('TicketSystemSchema', () => {
    it('should validate valid ticket systems', () => {
      expect(TicketSystemSchema.parse('5x2')).toBe('5x2')
      expect(TicketSystemSchema.parse('16x12')).toBe('16x12')
      expect(TicketSystemSchema.parse('7x3')).toBe('7x3')
    })

    it('should reject invalid formats', () => {
      expect(() => TicketSystemSchema.parse('5')).toThrow()
      expect(() => TicketSystemSchema.parse('5x')).toThrow()
      expect(() => TicketSystemSchema.parse('x2')).toThrow()
      expect(() => TicketSystemSchema.parse('5-2')).toThrow()
    })

    it('should reject out-of-range values', () => {
      expect(() => TicketSystemSchema.parse('4x2')).toThrow() // main < 5
      expect(() => TicketSystemSchema.parse('17x2')).toThrow() // main > 16
      expect(() => TicketSystemSchema.parse('5x1')).toThrow() // euro < 2
      expect(() => TicketSystemSchema.parse('5x13')).toThrow() // euro > 12
    })
  })

  describe('AppConfigSchema', () => {
    it('should validate complete configuration with correct lucky code format', () => {
      const config = {
        system: '5x2',
        tickets: 10,
        method: 'weighted' as const,
        lucky: 'sunset-beach-87',
      }

      const result = AppConfigSchema.parse(config)
      expect(result).toEqual(config)
    })

    it('should reject configuration with old lucky code format - this prevents the original bug', () => {
      const configWithOldLuckyFormat = {
        system: '5x2',
        tickets: 10,
        method: 'weighted' as const,
        lucky: 'ABC123', // Old format that caused the sharing bug
      }

      // This test would have caught the original bug
      expect(() => AppConfigSchema.parse(configWithOldLuckyFormat)).toThrow()
    })

    it('should validate minimal configuration', () => {
      const config = {
        system: '7x3',
        tickets: 1,
        method: 'random' as const,
      }

      const result = AppConfigSchema.parse(config)
      expect(result).toEqual(config)
    })

    it('should coerce ticket count to number', () => {
      const config = {
        system: '5x2',
        tickets: '25', // string that should be coerced
        method: 'weighted' as const,
      }

      const result = AppConfigSchema.parse(config)
      expect(result.tickets).toBe(25)
      expect(typeof result.tickets).toBe('number')
    })

    it('should reject invalid ticket counts', () => {
      const config = {
        system: '5x2',
        tickets: 0, // too low
        method: 'weighted' as const,
      }

      expect(() => AppConfigSchema.parse(config)).toThrow()
    })

    it('should reject invalid methods', () => {
      const config = {
        system: '5x2',
        tickets: 10,
        method: 'invalid', // not allowed
      }

      expect(() => AppConfigSchema.parse(config)).toThrow()
    })
  })

  describe('validation helpers', () => {
    it('validateAppConfig should return valid config', () => {
      const config = {
        system: '6x2',
        tickets: 50,
        method: 'random' as const,
      }

      const result = validateAppConfig(config)
      expect(result).toEqual(config)
    })

    it('validateAppConfig should return null for invalid config', () => {
      const config = {
        system: '5x2',
        tickets: -1, // invalid
        method: 'random' as const,
      }

      const result = validateAppConfig(config)
      expect(result).toBeNull()
    })

    it('validateLegacyConfig should handle legacy format', () => {
      const config = {
        seed: 'legacy-seed-123',
        type: '5x2',
        count: 10,
        method: 'weighted' as const,
      }

      const result = validateLegacyConfig(config)
      expect(result).toBeTruthy()
    })
  })

  describe('parseTicketSystem', () => {
    it('should parse valid system strings', () => {
      const result = parseTicketSystem('7x4')
      expect(result).toEqual({
        mainCount: 7,
        euroCount: 4,
      })
    })

    it('should return null for invalid system', () => {
      const result = parseTicketSystem('invalid')
      expect(result).toBeNull()
    })

    it('should return null for out-of-range values', () => {
      const result = parseTicketSystem('20x15')
      expect(result).toBeNull()
    })
  })

  describe('formatTicketSystem', () => {
    it('should format valid counts', () => {
      const result = formatTicketSystem(6, 3)
      expect(result).toBe('6x3')
    })

    it('should return fallback for invalid counts', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = formatTicketSystem(0, 0)
      expect(result).toBe('5x2') // fallback
      expect(consoleSpy).toHaveBeenCalledWith('Invalid ticket system counts:', {
        mainCount: 0,
        euroCount: 0,
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Additional Schema Tests', () => {
    describe('SelectionMethodSchema', () => {
      it('should validate correct selection methods', () => {
        expect(() => SelectionMethodSchema.parse('random')).not.toThrow()
        expect(() => SelectionMethodSchema.parse('weighted')).not.toThrow()
      })

      it('should reject invalid selection methods', () => {
        const invalidMethods = [
          'invalid',
          'RANDOM',
          'weighted-random',
          '',
          'uniform',
        ]

        invalidMethods.forEach((method) => {
          expect(() => SelectionMethodSchema.parse(method)).toThrow()
        })
      })
    })

    describe('TicketCountSchema', () => {
      it('should validate and coerce valid ticket counts', () => {
        // Valid numbers
        expect(TicketCountSchema.parse(1)).toBe(1)
        expect(TicketCountSchema.parse(500)).toBe(500)
        expect(TicketCountSchema.parse(250)).toBe(250)

        // String coercion
        expect(TicketCountSchema.parse('1')).toBe(1)
        expect(TicketCountSchema.parse('500')).toBe(500)
        expect(TicketCountSchema.parse('10')).toBe(10)
      })

      it('should reject invalid ticket counts', () => {
        const invalidCounts = [
          0, // Too low
          501, // Too high
          -1, // Negative
          1.5, // Not integer
          'abc', // Not a number
          '', // Empty string
        ]

        invalidCounts.forEach((count) => {
          expect(() => TicketCountSchema.parse(count)).toThrow()
        })
      })
    })

    describe('validateUrlParams', () => {
      it('should validate URL parameter objects', () => {
        const validParams = {
          system: '5x2',
          tickets: '10',
          method: 'weighted',
          lucky: 'sunset-beach-87',
        }

        const result = validateUrlParams(validParams)
        expect(result).toEqual(validParams)
      })

      it('should return null for invalid URL parameters', () => {
        const consoleSpy = vi
          .spyOn(console, 'warn')
          .mockImplementation(() => {})

        // Use a non-string value to actually fail validation
        const invalidParams = {
          system: 123, // Should be string
        }

        const result = validateUrlParams(invalidParams)
        expect(result).toBeNull()
        expect(consoleSpy).toHaveBeenCalledWith(
          'Invalid URL parameters:',
          expect.any(Object)
        )

        consoleSpy.mockRestore()
      })
    })
  })

  describe('Bug Prevention Integration Tests', () => {
    it('should ensure lucky code schema prevents the original sharing bug', () => {
      // The original bug: lucky code validation failed silently, causing empty URL hashes
      const originalBugScenario = {
        system: '5x2',
        tickets: 1,
        method: 'random',
        lucky: 'ABC123', // This format broke URL generation
      }

      // The schema should now explicitly reject this
      expect(() => AppConfigSchema.parse(originalBugScenario)).toThrow()

      // And the validator should return null
      const validationResult = validateAppConfig(originalBugScenario)
      expect(validationResult).toBeNull()
    })

    it('should ensure new lucky code format works end-to-end', () => {
      const correctConfig: AppConfig = {
        system: '5x2',
        tickets: 1,
        method: 'random',
        lucky: 'sunset-beach-87', // Correct format
      }

      // Should parse successfully
      expect(() => AppConfigSchema.parse(correctConfig)).not.toThrow()

      // Validator should return the config
      const validationResult = validateAppConfig(correctConfig)
      expect(validationResult).toEqual(correctConfig)
    })

    it('should maintain backwards compatibility for legacy configs without lucky codes', () => {
      const legacyConfig = {
        seed: 'old-style-seed',
        type: '7x3',
        count: 25,
        method: 'weighted',
      }

      // Legacy schema should still work
      expect(() => LegacyConfigSchema.parse(legacyConfig)).not.toThrow()

      const result = validateLegacyConfig(legacyConfig)
      expect(result).toEqual(legacyConfig)
    })

    it('should provide clear error messages for debugging', () => {
      const testCases = [
        {
          input: {
            system: '5x2',
            tickets: 1,
            method: 'random',
            lucky: 'ABC123',
          },
          expectedError: 'Lucky code must be in format "adjective-noun-number"',
        },
        {
          input: { system: '4x2', tickets: 1, method: 'random' },
          expectedError:
            'System must be 5-16 main numbers and 2-12 euro numbers',
        },
        {
          input: { system: '5x2', tickets: 0, method: 'random' },
          expectedError: 'Minimum 1 ticket required',
        },
      ]

      testCases.forEach(({ input, expectedError }) => {
        try {
          AppConfigSchema.parse(input)
          fail('Should have thrown an error')
        } catch (error: any) {
          // Handle different error structures flexibly (Zod v3/v4 differences)
          if (
            error.errors &&
            Array.isArray(error.errors) &&
            error.errors.length
          ) {
            const messages = error.errors.map((e: any) => e.message)
            expect(messages).toContain(expectedError)
            return
          }

          if (
            error.issues &&
            Array.isArray(error.issues) &&
            error.issues.length
          ) {
            const messages = error.issues.map((e: any) => e.message)
            expect(messages).toContain(expectedError)
            return
          }

          if (error.message) {
            const normalized = String(error.message).replace(/\\"/g, '"')
            expect(normalized).toContain(expectedError)
            return
          }

          expect(error).toBeDefined()
          console.log(
            'Unexpected error structure for input:',
            input,
            'Error:',
            JSON.stringify(error, null, 2)
          )
        }
      })
    })
  })
})
