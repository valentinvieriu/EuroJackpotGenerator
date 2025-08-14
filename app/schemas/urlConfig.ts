/**
 * Zod schemas for URL configuration validation and type safety
 * Provides robust parsing and backwards compatibility for EuroJackpot configuration URLs
 */

import { z, ZodError } from 'zod'

/**
 * Compatibility shim for Zod v4: expose `errors` alias for `.issues`.
 * Some tests/tools still expect `error.errors[0].message` like Zod v3.
 */
try {
  // Define once, non-enumerable, if not already present
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proto: any = (ZodError as unknown as { new (): ZodError }).prototype
  if (proto && !Object.prototype.hasOwnProperty.call(proto, 'errors')) {
    Object.defineProperty(proto, 'errors', {
      get(this: ZodError) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this as any).issues
      },
      configurable: true,
    })
  }
  // Provide a cleaner message that includes raw issue messages (without JSON escaping)
  const originalHasOwnMessage = Object.prototype.hasOwnProperty.call(
    proto,
    'message'
  )
  if (proto && !originalHasOwnMessage) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'message')
    // Only override if not already a getter on prototype
    if (!descriptor || typeof descriptor.get !== 'function') {
      Object.defineProperty(proto, 'message', {
        get(this: ZodError) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const issues = ((this as any).issues ?? []) as Array<{
            message?: string
          }>
          const msgs = issues.map((i) => i.message).filter(Boolean) as string[]
          return msgs.length ? msgs.join('\n') : 'Zod validation error'
        },
        configurable: true,
      })
    }
  }
} catch {
  // No-op: if patching fails, tests will fall back to message checks
}

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
