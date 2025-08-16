/**
 * Centralized error handling utilities
 * Provides consistent error message extraction across the application
 */

/**
 * Extract a user-friendly error message from various error types
 * Handles different error formats that can come from API calls, Zod validation, etc.
 * @param err The error to extract a message from
 * @returns A string error message suitable for display to users
 */
export function extractErrorMessage(err: unknown): string {
  // Handle string errors
  if (typeof err === 'string') return err

  // Handle Error instances
  if (err instanceof Error) return err.message

  // Handle structured error objects (e.g., from API responses)
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>

    // Check for nested data.message (common in API errors)
    const data = (e.data as Record<string, unknown> | undefined) ?? undefined
    if (data?.message && typeof data.message === 'string') {
      return data.message
    }

    // Check for direct message property
    if (e.message && typeof e.message === 'string') {
      return e.message
    }

    // Check for statusMessage (H3 errors)
    if (e.statusMessage && typeof e.statusMessage === 'string') {
      return e.statusMessage
    }
  }

  // Fallback for unknown error types
  return 'An unexpected error occurred'
}

/**
 * Create a standardized error for display
 * Useful for consistent error formatting across stores
 * @param message The error message
 * @param context Optional context about where the error occurred
 * @returns A formatted error message
 */
export function createErrorMessage(message: string, context?: string): string {
  if (context) {
    return `${context}: ${message}`
  }
  return message
}
