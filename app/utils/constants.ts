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
export const LARGE_SIMULATION_THRESHOLD = 1000 // Export disabled above this

// UI Timing Constants (milliseconds)
export const WELCOME_DISPLAY_MS = 12000 // Welcome message auto-hide duration
export const TRANSIENT_ERROR_MS = 5000 // Transient error auto-hide duration
export const COPY_SUCCESS_MS = 2000 // Copy success feedback duration
export const URL_DEBOUNCE_MS = 250 // URL update debounce delay

// Ticket UI Constants
export const MINIMUM_TICKETS_FOR_DELETION = 0 // Allow deleting all tickets (reset to fresh state)

// Network Timeout Constants (milliseconds)
export const DEFAULT_FETCH_TIMEOUT_MS = 8000 // Standard API timeout

// EuroJackpot Draw Schedule
export const EUROJACKPOT_DRAW_DAYS = [2, 5] as const // Tuesday = 2, Friday = 5
export const DRAWS_PER_YEAR = EUROJACKPOT_DRAW_DAYS.length * 52

// Slot machine reel timing (milliseconds)
export const REEL_MIN_SPIN_MS = 500 // Reels spin at least this long, even if the draw returns instantly
export const REEL_STAGGER_MS = 90 // Delay between one reel stopping and the next
export const REEL_LAND_MS = 420 // Duration of a single reel's landing animation
export const REEL_SETTLE_GRACE_MS = 400 // Wait this long for a result before giving up on a spin
export const LED_TWEEN_MS = 600 // LED meters roll to their new value over this duration

// Sound: volume multiplier per user-selected level
export const SOUND_LEVEL_VOLUME = {
  none: 0,
  low: 0.3,
  medium: 0.7,
  high: 1,
} as const
export const REEL_STOP_SOUND_AT = 0.7 // Fraction of a reel's landing animation at which its stop is heard

// Autoplay (Monte Carlo) chart resolution
export const AUTOPLAY_CHART_POINTS = 50 // Progress updates requested per run; each becomes a chart point

// Simulation Thresholds for Highlighting
export const SIGNIFICANT_WIN_FRACTION_LARGE = 0.15 // 15% of wins for large simulations
export const SIGNIFICANT_WIN_ABS_MIN = 5 // Absolute minimum wins to highlight

// Fallback Limits
export const FALLBACK_SIMULATION_MAX = 3 // Maximum fallback simulations when external API fails

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

// Favorite Numbers Limits
export const FAVORITE_NUMBERS_MAX = 5
export const FAVORITE_NUMBERS_MIN = 0

// Algorithm Enhancement Constants
export const FAVORITE_WEIGHT_MULTIPLIER = 10 // Multiplier for favorite number weighting

// Popularity Scoring Constants
export const POPULARITY_WEIGHT_BIRTHDAY_PER_MAIN = 0.2 // Each main number ≤31 adds popularity
export const POPULARITY_WEIGHT_LUCKY_PER_MAIN = 0.15 // "Lucky" numbers often over-picked
export const POPULARITY_WEIGHT_SEQUENCE_BASE = 0.25 // Long arithmetic sequences
export const POPULARITY_WEIGHT_SAME_LAST_DIGIT = 0.12 // Same last-digit clustering
export const POPULARITY_WEIGHT_SAME_DECADE = 0.1 // Same-decade clustering
export const POPULARITY_WEIGHT_TIGHT_SPREAD = 0.18 // Tight spread (numbers bunched)
export const POPULARITY_WEIGHT_EURO_MONTH = 0.1 // Euro numbers close (month-like)
export const POPULARITY_Q_MIN = 0.25 // Minimum qMultiplier relative to uniform
export const POPULARITY_Q_MAX = 1.75 // Maximum qMultiplier relative to uniform
export const POPULARITY_LUCKY_NUMBERS = new Set([3, 7, 11, 13, 17, 21]) // Common "lucky" numbers
export const POPULARITY_CANDIDATES_COUNT = 100 // Number of combinations to generate for unpopular selection
export const POPULARITY_EURO_MONTH_SPREAD_THRESHOLD = 3 // Euro numbers spread threshold for month effect

// Lotto Bayern bookmarklet: fills the tickets from this app into Lotto Bayern's form
export const LOTTO_BAYERN_ORIGIN = 'https://www.lotto-bayern.de'
export const LOTTO_BAYERN_NORMAL_PATH = '/eurojackpot/normalschein'
export const LOTTO_BAYERN_NORMAL_FIELD_MAX = 12 // Lines on one standard slip
export const LOTTO_BAYERN_HANDOFF_KEY = 'eurojackpot' // URL fragment key that carries the lines to the form
export const BOOKMARKLET_EDITOR_TIMEOUT_MS = 4500 // How long to wait for the site's number editor to react
export const BOOKMARKLET_POLL_MS = 25 // How often to check whether it has
export const BOOKMARKLET_URL_PATH =
  '/bookmarklet/lotto-bayern-bookmarklet-url.txt' // Built bookmark URL, served from public/

// EuroJackpot payout rules (game rules since March 2022)
// Half of every stake goes into the prize pool; the pool is split across the
// 12 classes in fixed shares, and the rest feeds a reserve that tops up jackpots.
export const EUROJACKPOT_PAYOUT_RATIO = 0.5
export const EUROJACKPOT_PRIZE_POOL_SHARES: Readonly<Record<number, number>> = {
  1: 0.36,
  2: 0.086,
  3: 0.0485,
  4: 0.008,
  5: 0.01,
  6: 0.011,
  7: 0.008,
  8: 0.0255,
  9: 0.0285,
  10: 0.054,
  11: 0.0675,
  12: 0.203,
}
export const EUROJACKPOT_BOOSTER_FUND_SHARE = 0.09

// EuroJackpot System Constants (for popularity scoring)
export const EUROJACKPOT_TOTAL_COMBINATIONS = 139_838_160 // C(50,5) * C(12,2)

// Simple Mode Configuration
export const SIMPLE_MODE_TICKET_COUNT = 10
export const SIMPLE_MODE_TICKET_COUNT_MAX = 50
export const SIMPLE_MODE_SYSTEM_MAIN = 5
export const SIMPLE_MODE_SYSTEM_EURO = 2
export const SIMPLE_MODE_METHOD = 'random' as const

// Simulation Option Values
export const SIMULATION_OPTION_VALUES = [
  100, 250, 500, 1000, 2500, 5000, 10000,
] as const

// Frequency Ratio Thresholds
export const FREQ_RATIO_STRONG = 1.15
export const FREQ_RATIO_MILD = 1.05
