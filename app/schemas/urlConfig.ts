/**
 * Zod schemas for URL configuration validation and type safety
 * Provides robust parsing and backwards compatibility for EuroJackpot configuration URLs
 */

import { z } from 'zod'
/**
 * Note: Do not patch ZodError globally. Use safeParse().error.issues/format().
 */

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
 * Schema for lucky code (adjective-noun-number format)
 */
export const LuckyCodeSchema = z
  .string()
  .regex(
    /^[a-z]+-[a-z]+-([1-9]\d{0,2})$/,
    'Lucky code must be in format "adjective-noun-number"'
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
// Legacy URL format removed — only modern format is supported.

/**
 * URL search params schema for parsing query strings
 */
export const UrlParamsSchema = z.object({
  system: z.string().optional(),
  tickets: z.string().optional(),
  method: z.string().optional(),
  lucky: z.string().optional(),
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
export type UrlParams = z.infer<typeof UrlParamsSchema>
export type ParsedSystem = z.infer<typeof ParsedSystemSchema>
export type SelectionMethod = z.infer<typeof SelectionMethodSchema>

/**
 * Validation helpers with descriptive error messages
 */
export const validateAppConfig = (data: unknown): AppConfig | null => {
  const result = AppConfigSchema.safeParse(data)
  if (result.success) return result.data
  // Prefer concise issues list; fall back to formatted tree
  console.warn(
    'Invalid app configuration:',
    result.error.issues.length ? result.error.issues : result.error.format()
  )
  return null
}

// Legacy validation removed.

export const validateUrlParams = (data: unknown): UrlParams | null => {
  const result = UrlParamsSchema.safeParse(data)
  if (result.success) return result.data
  console.warn(
    'Invalid URL parameters:',
    result.error.issues.length ? result.error.issues : result.error.format()
  )
  return null
}

/**
 * Parse ticket system string into main/euro counts
 */
export const parseTicketSystem = (system: string): ParsedSystem | null => {
  // Validate the system string first
  const sysResult = TicketSystemSchema.safeParse(system)
  if (!sysResult.success) {
    console.warn(
      'Invalid ticket system format:',
      sysResult.error.issues.length
        ? sysResult.error.issues
        : sysResult.error.format()
    )
    return null
  }

  const [mainStr, euroStr] = sysResult.data.split('x')
  const parsed = {
    mainCount: Number.parseInt(mainStr),
    euroCount: Number.parseInt(euroStr),
  }
  const parseResult = ParsedSystemSchema.safeParse(parsed)
  if (parseResult.success) return parseResult.data
  console.warn(
    'Parsed system out of bounds:',
    parseResult.error.issues.length
      ? parseResult.error.issues
      : parseResult.error.format()
  )
  return null
}

/**
 * Format ticket system from counts
 */
export const formatTicketSystem = (
  mainCount: number,
  euroCount: number
): string => {
  const candidate = `${mainCount}x${euroCount}`
  const result = TicketSystemSchema.safeParse(candidate)
  if (result.success) return result.data
  console.warn('Invalid ticket system counts:', { mainCount, euroCount })
  return '5x2' // Default fallback
}
