import { ndjsonEventSchema, type NdjsonEvent } from '~/schemas/ndjson'
import { logger } from '~/utils/logger'

/**
 * Centralized NDJSON event parser with schema validation
 *
 * @param raw Raw parsed JSON object from NDJSON stream
 * @returns Validated NdjsonEvent or null if parsing fails
 */
export function parseNdjsonEvent(raw: unknown): NdjsonEvent | null {
  // Primary: Use schema validation for type safety
  const parseResult = ndjsonEventSchema.safeParse(raw)
  if (parseResult.success) {
    return parseResult.data
  }

  // Minimal fallback: Basic type guards for catastrophic API issues
  // Only handle cases where server might emit malformed but recognizable events
  if (
    raw &&
    typeof raw === 'object' &&
    'type' in raw &&
    typeof (raw as { type: unknown }).type === 'string'
  ) {
    const event = raw as { type: string; [key: string]: unknown }

    // Basic error event fallback
    if (event.type === 'error') {
      return {
        type: 'error',
        error: typeof event.error === 'string' ? event.error : 'Stream error',
      }
    }

    // Basic result event fallback (trust server provides valid result)
    if (event.type === 'result' && event.result) {
      return {
        type: 'result',
        result: event.result as import('~/schemas').BatchSimulationResult,
      }
    }

    // Progress events are too complex for safe fallback parsing
    // If schema validation fails, skip the event rather than risking corruption
  }

  // Log schema validation errors for debugging
  if (!parseResult.success) {
    logger.warn(
      'NDJSON event failed schema validation:',
      parseResult.error.issues,
      'Raw event:',
      raw
    )
  }

  return null
}
