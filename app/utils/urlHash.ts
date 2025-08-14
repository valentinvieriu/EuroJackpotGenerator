/**
 * URL hash utilities for encoding and decoding Lucky Numbers configurations
 * Enables sharing of ticket configurations via user-friendly URL fragments
 * Enhanced with Zod validation for type safety and robust error handling
 */

import {
  validateAppConfig,
  validateLegacyConfig,
  validateUrlParams,
  parseTicketSystem as parseTicketSystemZod,
  formatTicketSystem as formatTicketSystemZod,
  type AppConfig,
  type ParsedSystem,
  type SelectionMethod,
} from '~/schemas/urlConfig'

export type AppState = 'SHARED' | 'FRESH'

// Re-export types for compatibility
export type { AppConfig, SelectionMethod }

// Legacy interface for backwards compatibility
export interface TicketConfig {
  seed: string
  ticketType: string
  ticketCount: number
  selectionMethod: 'random' | 'weighted'
}

/**
 * Encodes app configuration into URL hash format with validation
 * @param config App configuration object
 * @returns URL hash string (without #)
 */
export function encodeAppConfigToHash(config: AppConfig): string {
  // Validate configuration before encoding
  const validConfig = validateAppConfig(config)
  if (!validConfig) {
    console.warn('Invalid app configuration provided to encoder:', config)
    return ''
  }

  const params = new URLSearchParams()

  if (validConfig.system) params.set('system', validConfig.system)
  if (validConfig.tickets) params.set('tickets', validConfig.tickets.toString())
  if (validConfig.method) params.set('method', validConfig.method)
  if (validConfig.lucky) params.set('lucky', validConfig.lucky)

  return params.toString()
}

/**
 * Legacy: Encodes ticket configuration into URL hash format
 * @param config Ticket configuration object
 * @returns URL hash string (without #)
 */
export function encodeConfigToHash(config: TicketConfig): string {
  const params = new URLSearchParams()

  if (config.seed) params.set('seed', config.seed)
  if (config.ticketType) params.set('type', config.ticketType)
  if (config.ticketCount) params.set('count', config.ticketCount.toString())
  if (config.selectionMethod) params.set('method', config.selectionMethod)

  return params.toString()
}

/**
 * Decodes URL hash into app configuration with type-safe validation
 * @param hash URL hash string (with or without #)
 * @returns App configuration object or null if invalid
 */
export function decodeUrlHash(hash: string): Partial<AppConfig> | null {
  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash
  if (!cleanHash) return null

  try {
    const params = new URLSearchParams(cleanHash)

    // Convert URLSearchParams to object for validation
    const paramObj: Record<string, string> = {}
    params.forEach((value, key) => {
      paramObj[key] = value
    })

    // Validate URL parameters structure
    const validParams = validateUrlParams(paramObj)
    if (!validParams) {
      return null
    }

    // Check if this is modern format (has system and/or tickets parameters)
    // Legacy format uses different parameter names (type, count)
    if (
      validParams.system ||
      validParams.tickets ||
      (validParams.method &&
        !validParams.type &&
        !validParams.count &&
        !validParams.seed)
    ) {
      const config: Partial<AppConfig> = {}

      // Use Zod coercion for safe parsing
      if (validParams.system) {
        config.system = validParams.system
      }

      if (validParams.tickets) {
        const parsedTickets = Number.parseInt(validParams.tickets, 10)
        if (!Number.isNaN(parsedTickets) && parsedTickets > 0) {
          // Apply validation: clamp tickets to max of 500
          config.tickets = Math.min(parsedTickets, 500)
        }
      }

      if (
        validParams.method === 'random' ||
        validParams.method === 'weighted'
      ) {
        config.method = validParams.method
      }

      if (validParams.lucky) {
        config.lucky = validParams.lucky
      }

      // Attempt to validate the complete configuration
      const validatedConfig = validateAppConfig(config)
      return validatedConfig || config // Return partial config if full validation fails
    }

    return null // No valid configuration parameters
  } catch (error) {
    console.warn('Failed to decode configuration hash:', error)
    return null
  }
}

/**
 * Legacy: Decodes URL hash into ticket configuration with validation
 * @param hash URL hash string (with or without #)
 * @returns Partial ticket configuration object
 */
export function decodeHashToConfig(hash: string): Record<string, unknown> {
  // Remove # if present
  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash

  if (!cleanHash) return {}

  try {
    const params = new URLSearchParams(cleanHash)

    // Convert URLSearchParams to object for validation
    const paramObj: Record<string, string> = {}
    params.forEach((value, key) => {
      paramObj[key] = value
    })

    // Validate URL parameters structure first
    const validParams = validateUrlParams(paramObj)
    if (!validParams) {
      return {}
    }

    const config: Record<string, unknown> = {}

    // Handle legacy format (seed, type, count)
    if (validParams.seed) config.seed = validParams.seed
    if (validParams.type) config.type = validParams.type

    if (validParams.count) {
      const parsedCount = Number.parseInt(validParams.count, 10)
      if (!Number.isNaN(parsedCount) && parsedCount > 0) {
        config.count = parsedCount
      }
    }

    if (validParams.method === 'random' || validParams.method === 'weighted') {
      config.method = validParams.method
    }

    // Attempt validation using legacy schema
    const validatedConfig = validateLegacyConfig(config)
    return validatedConfig || config // Return partial config if validation fails
  } catch (error) {
    console.warn('Failed to decode URL hash:', error)
    return {}
  }
}

/**
 * Parses ticket type string into main and euro counts with Zod validation
 * @param ticketType Format: "mainCount x euroCount" (e.g., "5x2")
 * @returns Object with mainCount and euroCount, or null if invalid
 */
export function parseTicketType(ticketType: string): ParsedSystem | null {
  return parseTicketSystemZod(ticketType)
}

/**
 * Formats main and euro counts into ticket type string with validation
 * @param mainCount Number of main numbers
 * @param euroCount Number of euro numbers
 * @returns Ticket type string (e.g., "5x2")
 */
export function formatTicketType(mainCount: number, euroCount: number): string {
  return formatTicketSystemZod(mainCount, euroCount)
}

// Word lists for generating user-friendly codes
const adjectives = [
  'golden',
  'silver',
  'lucky',
  'magic',
  'mystic',
  'crystal',
  'diamond',
  'emerald',
  'sunset',
  'dawn',
  'cosmic',
  'stellar',
  'royal',
  'noble',
  'bright',
  'shining',
  'winning',
  'fortune',
  'treasure',
  'secret',
  'hidden',
  'sacred',
  'blessed',
  'charmed',
  'rainbow',
  'sparkle',
  'glowing',
  'radiant',
  'brilliant',
  'dazzling',
  'gleaming',
  'lustrous',
]

const nouns = [
  'ticket',
  'numbers',
  'combination',
  'sequence',
  'pattern',
  'formula',
  'code',
  'key',
  'star',
  'moon',
  'sun',
  'galaxy',
  'comet',
  'meteor',
  'planet',
  'cosmos',
  'treasure',
  'jewel',
  'gem',
  'crown',
  'scepter',
  'ring',
  'amulet',
  'charm',
  'dream',
  'wish',
  'hope',
  'destiny',
  'fortune',
  'miracle',
  'wonder',
  'magic',
  'beach',
  'mountain',
  'forest',
  'river',
  'ocean',
  'valley',
  'meadow',
  'garden',
]

/**
 * Generates a user-friendly lucky code
 * @returns Memorable code string like "sunset-beach-87"
 */
export function generateLuckyCode(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const number = Math.floor(Math.random() * 999) + 1
  return `${adjective}-${noun}-${number}`
}

/**
 * Converts a legacy seed to a Lucky Code (for migration/backwards compatibility)
 * @param seed Legacy seed string
 * @returns User-friendly lucky code
 */
export function seedToLuckyCode(seed: string): string {
  // Use the seed as input to deterministically generate a lucky code
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32-bit signed integer
  }

  // Use hash to pick deterministic words
  const adjIndex = Math.abs(hash) % adjectives.length
  const nounIndex = Math.abs(hash >> 8) % nouns.length
  const number = (Math.abs(hash >> 16) % 999) + 1

  return `${adjectives[adjIndex]}-${nouns[nounIndex]}-${number}`
}

/**
 * Legacy: Generates a random seed for ticket generation
 * @returns Random seed string
 */
export function generateRandomSeed(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}`
}

/**
 * Gets the current URL with app configuration hash
 * @param config App configuration to encode
 * @returns Complete URL with hash
 */
export function getAppConfigUrl(config: AppConfig): string {
  const baseUrl = window.location.origin + window.location.pathname
  const hash = encodeAppConfigToHash(config)
  return `${baseUrl}#${hash}`
}

/**
 * Enhanced URL parsing that handles both modern and legacy formats
 * with automatic migration to the new format
 * @param hash URL hash string (with or without #)
 * @returns Parsed app configuration or null if invalid
 */
export function parseUrlHash(hash: string): Partial<AppConfig> | null {
  if (!hash) return null

  // Try modern format first
  const modernConfig = decodeUrlHash(hash)
  if (modernConfig && Object.keys(modernConfig).length > 0) {
    return modernConfig
  }

  // Fall back to legacy format
  const legacyConfig = decodeHashToConfig(hash)
  if (legacyConfig && Object.keys(legacyConfig).length > 0) {
    // Convert legacy to modern format
    const convertedConfig: Partial<AppConfig> = {}

    if (legacyConfig.type) {
      convertedConfig.system = legacyConfig.type
    }

    if (legacyConfig.count) {
      convertedConfig.tickets = legacyConfig.count
    }

    if (legacyConfig.method) {
      convertedConfig.method = legacyConfig.method
    }

    // Convert seed to lucky code for reproducibility
    if (legacyConfig.seed) {
      convertedConfig.lucky = seedToLuckyCode(legacyConfig.seed)
    }

    // Validate converted configuration
    const validatedConfig = validateAppConfig(convertedConfig)
    return validatedConfig || convertedConfig
  }

  return null
}

/**
 * Updates the browser URL with new configuration
 * @param config Configuration to encode or null for fresh state
 */
export function updateBrowserUrl(config: AppConfig | null): void {
  const baseUrl = window.location.origin + window.location.pathname

  if (!config) {
    // Fresh state - no hash
    window.history.replaceState(null, '', baseUrl)
    return
  }

  const hash = encodeAppConfigToHash(config)
  window.history.replaceState(null, '', `${baseUrl}#${hash}`)
}

/**
 * Legacy: Gets the current URL with updated hash
 * @param config Ticket configuration to encode
 * @returns Complete URL with hash
 */
export function getShareableUrl(config: TicketConfig): string {
  const baseUrl = window.location.origin + window.location.pathname
  const hash = encodeConfigToHash(config)
  return `${baseUrl}#${hash}`
}

/**
 * Copies the app configuration URL to clipboard
 * @param config App configuration to share
 * @returns Promise that resolves when copied successfully
 */
export async function copyConfigUrl(config: AppConfig): Promise<void> {
  const url = getAppConfigUrl(config)

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url)
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = url
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      document.execCommand('copy')
    } finally {
      document.body.removeChild(textArea)
    }
  }
}

/**
 * Legacy: Copies the shareable URL to clipboard
 * @param config Ticket configuration to share
 * @returns Promise that resolves when copied successfully
 */
export async function copyShareableUrl(config: TicketConfig): Promise<void> {
  const url = getShareableUrl(config)

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url)
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = url
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      document.execCommand('copy')
    } finally {
      document.body.removeChild(textArea)
    }
  }
}
