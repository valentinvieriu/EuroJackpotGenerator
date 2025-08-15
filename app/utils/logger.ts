/**
 * Universal Logger Utility
 * Provides environment-aware logging with zero-cost debug logs in production
 * Works for both client-side (browser/SSR) and server-side (Cloudflare Workers)
 */

import { type LogLevel, LOG_LEVEL_PRIORITY } from './constants'

/**
 * Logger interface compatible with console.*
 */
export interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/**
 * Determine if we're running on the server side
 */
const isServer = typeof window === 'undefined'

/**
 * Get the current log level from environment configuration
 */
function getCurrentLogLevel(): LogLevel {
  if (isServer) {
    // Server-side: use runtime config or fallback to environment
    try {
      // Try to access Nuxt runtime config if available
      if (typeof useRuntimeConfig === 'function') {
        return useRuntimeConfig().logLevel as LogLevel
      }
    } catch {
      // Fallback for cases where useRuntimeConfig is not available
    }
    // Direct environment access for server
    return (
      (process.env.LOG_LEVEL as LogLevel) ||
      (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
    )
  } else {
    // Client-side: use public runtime config or fallback
    try {
      if (typeof useRuntimeConfig === 'function') {
        return useRuntimeConfig().public.logLevel as LogLevel
      }
    } catch {
      // Fallback for SSR or build-time environments
    }
    // Default fallback for client
    return 'info'
  }
}

/**
 * Check if a log level should be output based on current configuration
 */
function shouldLog(level: LogLevel): boolean {
  const currentLevel = getCurrentLogLevel()
  const currentPriority = LOG_LEVEL_PRIORITY[currentLevel]
  const messagePriority = LOG_LEVEL_PRIORITY[level]

  return messagePriority <= currentPriority
}

/**
 * Format log message with context
 */
function formatMessage(level: LogLevel, ...args: unknown[]): unknown[] {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`

  if (isServer) {
    // Server-side: add more structured logging for Cloudflare Workers observability
    return [prefix, ...args]
  } else {
    // Client-side: simpler format
    return [prefix, ...args]
  }
}

/**
 * Create the logger instance
 */
function createLogger(): Logger {
  return {
    debug: (...args: unknown[]) => {
      // Tree-shakeable in production builds
      if (process.env.NODE_ENV !== 'production' && shouldLog('debug')) {
        console.debug(...formatMessage('debug', ...args))
      }
    },

    info: (...args: unknown[]) => {
      if (shouldLog('info')) {
        console.info(...formatMessage('info', ...args))
      }
    },

    warn: (...args: unknown[]) => {
      if (shouldLog('warn')) {
        console.warn(...formatMessage('warn', ...args))
      }
    },

    error: (...args: unknown[]) => {
      if (shouldLog('error')) {
        console.error(...formatMessage('error', ...args))
      }
    },
  }
}

/**
 * Singleton logger instance - auto-imported utility
 */
export const logger = createLogger()

/**
 * Alternative factory function for custom loggers if needed
 */
export function createCustomLogger(customLevel?: LogLevel): Logger {
  if (customLevel) {
    return {
      debug: (...args: unknown[]) => {
        if (
          process.env.NODE_ENV !== 'production' &&
          LOG_LEVEL_PRIORITY.debug <= LOG_LEVEL_PRIORITY[customLevel]
        ) {
          console.debug(...formatMessage('debug', ...args))
        }
      },
      info: (...args: unknown[]) => {
        if (LOG_LEVEL_PRIORITY.info <= LOG_LEVEL_PRIORITY[customLevel]) {
          console.info(...formatMessage('info', ...args))
        }
      },
      warn: (...args: unknown[]) => {
        if (LOG_LEVEL_PRIORITY.warn <= LOG_LEVEL_PRIORITY[customLevel]) {
          console.warn(...formatMessage('warn', ...args))
        }
      },
      error: (...args: unknown[]) => {
        if (LOG_LEVEL_PRIORITY.error <= LOG_LEVEL_PRIORITY[customLevel]) {
          console.error(...formatMessage('error', ...args))
        }
      },
    }
  }

  return createLogger()
}

/**
 * Utility to check current log level (useful for conditional expensive operations)
 */
export function isLogLevelEnabled(level: LogLevel): boolean {
  return shouldLog(level)
}

/**
 * Note: LOG_LEVELS are available by importing directly from './constants'
 */
