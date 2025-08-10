import { createError } from 'h3'
import type { ZodSchema } from 'zod'

/**
 * Validates input data with proper error handling
 */
export function validateInput<T>(
  schema: ZodSchema<T>,
  data: unknown,
  context: string = 'request'
): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${context}`,
      data: {
        errors: result.error.issues,
        message: result.error.message,
      },
    })
  }

  return result.data
}

/**
 * Validates output data with proper error handling
 */
export function validateOutput<T>(
  schema: ZodSchema<T>,
  data: unknown,
  context: string = 'response'
): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    console.error(
      `Output validation failed for ${context}:`,
      result.error.issues
    )
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: {
        message: `Invalid ${context} format`,
      },
    })
  }

  return result.data
}

/**
 * Validates external API responses with proper error handling
 */
export function validateExternalResponse<T>(
  schema: ZodSchema<T>,
  data: unknown,
  source: string = 'external API'
): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    console.warn(
      `External API validation failed for ${source}:`,
      result.error.issues
    )
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      data: {
        message: `Invalid response from ${source}`,
        errors: result.error.issues,
      },
    })
  }

  return result.data
}

/**
 * Wraps fetch with timeout and proper error handling
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === 'AbortError') {
      throw createError({
        statusCode: 504,
        statusMessage: 'Gateway Timeout',
        data: {
          message: `Request to ${url} timed out after ${timeout}ms`,
        },
      })
    }

    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      data: {
        message: `Failed to fetch from ${url}: ${error instanceof Error ? error.message : String(error)}`,
      },
    })
  }
}

/**
 * Error boundary for API endpoints
 */
export function handleEndpointError(error: unknown, context: string): never {
  console.error(`Error in ${context}:`, error)

  // Re-throw H3 errors as-is
  if (error && typeof error === 'object' && 'statusCode' in error) {
    throw error
  }

  // Handle network/timeout errors
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      throw createError({
        statusCode: 504,
        statusMessage: 'Gateway Timeout',
        data: {
          message: 'Request timed out',
        },
      })
    }

    if (error.message.includes('fetch')) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Bad Gateway',
        data: {
          message: error.message,
        },
      })
    }
  }

  // Generic server error
  throw createError({
    statusCode: 500,
    statusMessage: 'Internal Server Error',
    data: {
      message: error instanceof Error ? error.message : String(error),
    },
  })
}
