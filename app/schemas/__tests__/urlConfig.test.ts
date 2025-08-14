import { describe, it, expect } from 'vitest'
import {
  AppConfigSchema,
  TicketSystemSchema,
  validateAppConfig,
  validateLegacyConfig,
  parseTicketSystem,
  formatTicketSystem,
} from '../urlConfig'

describe('URL Configuration Schemas', () => {
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
    it('should validate complete configuration', () => {
      const config = {
        system: '5x2',
        tickets: 10,
        method: 'weighted' as const,
        lucky: 'ABC123',
      }

      const result = AppConfigSchema.parse(config)
      expect(result).toEqual(config)
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
      const result = formatTicketSystem(0, 0)
      expect(result).toBe('5x2') // fallback
    })
  })
})
