// utils/constants.ts

// Lottery number ranges
export const MAIN_NUMBER_MIN = 1
export const MAIN_NUMBER_MAX = 50
export const EURO_NUMBER_MIN = 1
export const EURO_NUMBER_MAX = 12

// Standard draw counts
export const MAIN_NUMBERS_COUNT = 5
export const EURO_NUMBERS_COUNT = 2

// System ticket limits (how many numbers you can select)
export const MAIN_SYSTEM_MIN = 5
export const MAIN_SYSTEM_MAX = 16
export const EURO_SYSTEM_MIN = 2
export const EURO_SYSTEM_MAX = 12

// Win class ranges
export const WIN_CLASS_MIN = 1
export const WIN_CLASS_MAX = 12

// Ticket generation limits
export const TICKET_COUNT_MIN = 1
export const TICKET_COUNT_MAX = 500

// Simulation limits
export const SIMULATION_COUNT_MIN = 100
export const SIMULATION_COUNT_MAX = 10000

// Percentage bounds
export const PERCENTAGE_MIN = 0
export const PERCENTAGE_MAX = 100

// HTTP status code ranges
export const HTTP_ERROR_MIN = 400
export const HTTP_ERROR_MAX = 599

// UI Highlight Thresholds
export const WIN_RATE_EXCELLENT_THRESHOLD = 20 // % - Green colour
export const WIN_RATE_GOOD_THRESHOLD = 10 // % - Yellow colour
export const PROFIT_RATE_EXCELLENT_THRESHOLD = 50 // % - Green colour
export const PROFIT_RATE_GOOD_THRESHOLD = 25 // % - Yellow colour
export const NUMBER_FREQUENCY_THRESHOLD = 0.1 // 10% - Highlight numbers appearing frequently
export const WIN_CLASS_TIER_1_MAX = 3 // Classes 1-3 (highest prizes)
export const WIN_CLASS_TIER_2_MAX = 7 // Classes 4-7 (medium prizes)
export const LARGE_SIMULATION_THRESHOLD = 1000 // Export disabled above this
export const HIGH_SIMULATION_WARNING_THRESHOLD = 5000 // Show warning above this

// Logging configuration
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const

export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS]

// Log level hierarchy (lower numbers = higher priority)
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}
