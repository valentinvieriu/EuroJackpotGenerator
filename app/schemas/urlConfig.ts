/**
 * Zod schemas for URL configuration validation and type safety
 * Provides robust parsing and backwards compatibility for EuroJackpot configuration URLs
 */

import { z } from 'zod'

/**
 * Schema for ticket system format (e.g., "5x2", "6x3", "7x3")
 */
export const TicketSystemSchema = z
  .string()
  .regex(/^\d{1,2}x\d{1,2}$/, 'Invalid system format')
  .refine(
    (val) => {
      const [mainStr, euroStr] = val.split('x')
      const main = Number.parseInt(mainStr)
      const euro = Number.parseInt(euroStr)
      return main >= 5 && main <= 16 && euro >= 2 && euro <= 12
    },
    {
      message: 'System must be 5-16 main numbers and 2-12 euro numbers',
    }
  )

/**
 * Schema for selection method
 */
export const SelectionMethodSchema = z.enum(['random', 'weighted'], {
  errorMap: () => ({ message: 'Method must be either "random" or "weighted"' }),
})

/**
 * Schema for ticket count
 */
export const TicketCountSchema = z.coerce
  .number()
  .int()
  .min(1, 'Minimum 1 ticket required')
  .max(500, 'Maximum 500 tickets allowed')

/**
 * Schema for lucky code (6 characters, alphanumeric)
 */
export const LuckyCodeSchema = z
  .string()
  .regex(
    /^[A-Z0-9]{6}$/,
    'Lucky code must be 6 uppercase alphanumeric characters'
  )

/**
 * Main application configuration schema for current unified format
 */
export const AppConfigSchema = z.object({
  system: TicketSystemSchema,
  tickets: TicketCountSchema,
  method: SelectionMethodSchema,
  lucky: LuckyCodeSchema.optional(),
})

/**
 * Legacy configuration schema for backwards compatibility
 * Supports the old format with seed, type, count, method
 */
export const LegacyConfigSchema = z.object({
  seed: z.string().optional(),
  type: TicketSystemSchema.optional(), // Was "ticketType" in legacy
  count: TicketCountSchema.optional(), // Was "ticketCount" in legacy
  method: SelectionMethodSchema.optional(), // Was "selectionMethod" in legacy
})

/**
 * URL search params schema for parsing query strings
 */
export const UrlParamsSchema = z.object({
  system: z.string().optional(),
  tickets: z.string().optional(),
  method: z.string().optional(),
  lucky: z.string().optional(),
  // Legacy field aliases for backwards compatibility
  seed: z.string().optional(),
  type: z.string().optional(),
  count: z.string().optional(),
})

/**
 * Parsed ticket system result
 */
export const ParsedSystemSchema = z.object({
  mainCount: z.number().int().min(5).max(16),
  euroCount: z.number().int().min(2).max(12),
})

/**
 * Type exports for use throughout the application
 */
export type AppConfig = z.infer<typeof AppConfigSchema>
export type LegacyConfig = z.infer<typeof LegacyConfigSchema>
export type UrlParams = z.infer<typeof UrlParamsSchema>
export type ParsedSystem = z.infer<typeof ParsedSystemSchema>
export type SelectionMethod = z.infer<typeof SelectionMethodSchema>

/**
 * Validation helpers with descriptive error messages
 */
export const validateAppConfig = (data: unknown): AppConfig | null => {
  try {
    return AppConfigSchema.parse(data)
  } catch (error) {
    console.warn('Invalid app configuration:', error)
    return null
  }
}

export const validateLegacyConfig = (data: unknown): LegacyConfig | null => {
  try {
    return LegacyConfigSchema.parse(data)
  } catch (error) {
    console.warn('Invalid legacy configuration:', error)
    return null
  }
}

export const validateUrlParams = (data: unknown): UrlParams | null => {
  try {
    return UrlParamsSchema.parse(data)
  } catch (error) {
    console.warn('Invalid URL parameters:', error)
    return null
  }
}

/**
 * Parse ticket system string into main/euro counts
 */
export const parseTicketSystem = (system: string): ParsedSystem | null => {
  try {
    // First validate the format
    const validSystem = TicketSystemSchema.parse(system)
    const [mainStr, euroStr] = validSystem.split('x')

    return ParsedSystemSchema.parse({
      mainCount: Number.parseInt(mainStr),
      euroCount: Number.parseInt(euroStr),
    })
  } catch (error) {
    console.warn('Invalid ticket system format:', error)
    return null
  }
}

/**
 * Format ticket system from counts
 */
export const formatTicketSystem = (
  mainCount: number,
  euroCount: number
): string => {
  try {
    return TicketSystemSchema.parse(`${mainCount}x${euroCount}`)
  } catch {
    console.warn('Invalid ticket system counts:', { mainCount, euroCount })
    return '5x2' // Default fallback
  }
}
