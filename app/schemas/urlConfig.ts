/**
 * Zod schemas for URL configuration validation and type safety
 * Provides robust parsing and backwards compatibility for EuroJackpot configuration URLs
 */

import { z } from 'zod'

import {
  MAIN_SYSTEM_MIN,
  MAIN_SYSTEM_MAX,
  EURO_SYSTEM_MIN,
  EURO_SYSTEM_MAX,
  MAIN_NUMBER_MIN,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MIN,
  EURO_NUMBER_MAX,
  FAVORITE_NUMBERS_MIN,
  FAVORITE_NUMBERS_MAX,
} from '~/utils/constants'
import { logger } from '~/utils/logger'
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
      return (
        main >= MAIN_SYSTEM_MIN &&
        main <= MAIN_SYSTEM_MAX &&
        euro >= EURO_SYSTEM_MIN &&
        euro <= EURO_SYSTEM_MAX
      )
    },
    {
      message: 'System must be 5-16 main numbers and 2-12 euro numbers',
    }
  )

/**
 * Schema for selection method
 */
export const SelectionMethodSchema = z.enum(
  ['random', 'weighted', 'favorites', 'unpopular'],
  {
    errorMap: () => ({
      message:
        'Method must be "random", "weighted", "favorites", or "unpopular"',
    }),
  }
)

/**
 * Schema for app mode
 */
export const AppModeSchema = z.enum(['simple', 'custom'], {
  errorMap: () => ({
    message: 'Mode must be "simple" or "custom"',
  }),
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
 * Schema for favorite numbers configuration
 */
export const FavoriteNumbersSchema = z.object({
  mainNumbers: z
    .array(z.number().int().min(MAIN_NUMBER_MIN).max(MAIN_NUMBER_MAX))
    .min(FAVORITE_NUMBERS_MIN)
    .max(FAVORITE_NUMBERS_MAX)
    .default([]),
  euroNumbers: z
    .array(z.number().int().min(EURO_NUMBER_MIN).max(EURO_NUMBER_MAX))
    .min(FAVORITE_NUMBERS_MIN)
    .max(FAVORITE_NUMBERS_MAX)
    .default([]),
})

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
  mode: AppModeSchema.optional(),
  lucky: LuckyCodeSchema.optional(),
  fav_main: z.string().optional(), // comma-separated favorite main numbers
  fav_euro: z.string().optional(), // comma-separated favorite euro numbers
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
  mode: z.string().optional(),
  lucky: z.string().optional(),
  fav_main: z.string().optional(),
  fav_euro: z.string().optional(),
})

/**
 * Parsed ticket system result
 */
export const ParsedSystemSchema = z.object({
  mainCount: z.number().int().min(MAIN_SYSTEM_MIN).max(MAIN_SYSTEM_MAX),
  euroCount: z.number().int().min(EURO_SYSTEM_MIN).max(EURO_SYSTEM_MAX),
})

/**
 * Type exports for use throughout the application
 */
export type AppConfig = z.infer<typeof AppConfigSchema>
export type UrlParams = z.infer<typeof UrlParamsSchema>
export type ParsedSystem = z.infer<typeof ParsedSystemSchema>
export type SelectionMethod = z.infer<typeof SelectionMethodSchema>
export type AppMode = z.infer<typeof AppModeSchema>
export type FavoriteNumbers = z.infer<typeof FavoriteNumbersSchema>

/**
 * Validation helpers with descriptive error messages
 */
export const validateAppConfig = (data: unknown): AppConfig | null => {
  const result = AppConfigSchema.safeParse(data)
  if (result.success) return result.data
  // Prefer concise issues list; fall back to formatted tree
  logger.warn(
    'Invalid app configuration:',
    result.error.issues.length ? result.error.issues : result.error.format()
  )
  return null
}

// Legacy validation removed.

export const validateUrlParams = (data: unknown): UrlParams | null => {
  const result = UrlParamsSchema.safeParse(data)
  if (result.success) return result.data
  logger.warn(
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
    logger.warn(
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
  logger.warn(
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
  logger.warn('Invalid ticket system counts:', { mainCount, euroCount })
  return '5x2' // Default fallback
}
