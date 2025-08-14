/**
 * URL hash utilities for encoding and decoding Lucky Numbers configurations
 * Enables sharing of ticket configurations via user-friendly URL fragments
 */

export interface AppConfig {
  system: string // Format: "mainCount x euroCount" (e.g., "5x2", "6x3")
  tickets: number
  method: 'random' | 'weighted'
  lucky?: string // Optional seed for reproducible generation
}

export type AppState = 'SHARED' | 'FRESH'

// Legacy interface for backwards compatibility
export interface TicketConfig {
  seed: string
  ticketType: string
  ticketCount: number
  selectionMethod: 'random' | 'weighted'
}

/**
 * Encodes app configuration into URL hash format
 * @param config App configuration object
 * @returns URL hash string (without #)
 */
export function encodeAppConfigToHash(config: AppConfig): string {
  const params = new URLSearchParams()

  if (config.system) params.set('system', config.system)
  if (config.tickets) params.set('tickets', config.tickets.toString())
  if (config.method) params.set('method', config.method)
  if (config.lucky) params.set('lucky', config.lucky)

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
 * Decodes URL hash into app configuration
 * @param hash URL hash string (with or without #)
 * @returns App configuration object or null if invalid
 */
export function decodeUrlHash(hash: string): Partial<AppConfig> | null {
  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash
  if (!cleanHash) return null

  try {
    const params = new URLSearchParams(cleanHash)

    // Check if this has the expected parameters
    if (params.has('system') || params.has('tickets') || params.has('method')) {
      const config: Partial<AppConfig> = {}

      const system = params.get('system')
      if (system) config.system = system

      const tickets = params.get('tickets')
      if (tickets) {
        const parsedTickets = Number.parseInt(tickets, 10)
        if (!Number.isNaN(parsedTickets) && parsedTickets > 0) {
          config.tickets = parsedTickets
        }
      }

      const method = params.get('method')
      if (method === 'random' || method === 'weighted') {
        config.method = method
      }

      const lucky = params.get('lucky')
      if (lucky) config.lucky = lucky

      return config
    }

    return null // No valid configuration parameters
  } catch (error) {
    console.warn('Failed to decode configuration hash:', error)
    return null
  }
}

/**
 * Legacy: Decodes URL hash into ticket configuration
 * @param hash URL hash string (with or without #)
 * @returns Partial ticket configuration object
 */
export function decodeHashToConfig(hash: string): Partial<TicketConfig> {
  // Remove # if present
  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash

  if (!cleanHash) return {}

  try {
    const params = new URLSearchParams(cleanHash)
    const config: Partial<TicketConfig> = {}

    const seed = params.get('seed')
    if (seed) config.seed = seed

    const type = params.get('type')
    if (type) config.ticketType = type

    const count = params.get('count')
    if (count) {
      const parsedCount = Number.parseInt(count, 10)
      if (!Number.isNaN(parsedCount) && parsedCount > 0) {
        config.ticketCount = parsedCount
      }
    }

    const method = params.get('method')
    if (method === 'random' || method === 'weighted') {
      config.selectionMethod = method
    }

    return config
  } catch (error) {
    console.warn('Failed to decode URL hash:', error)
    return {}
  }
}

/**
 * Parses ticket type string into main and euro counts
 * @param ticketType Format: "mainCount x euroCount" (e.g., "5x2")
 * @returns Object with mainCount and euroCount, or null if invalid
 */
export function parseTicketType(
  ticketType: string
): { mainCount: number; euroCount: number } | null {
  if (!ticketType) return null

  const match = ticketType.match(/^(\d+)x(\d+)$/)
  if (!match || !match[1] || !match[2]) return null

  const mainCount = Number.parseInt(match[1], 10)
  const euroCount = Number.parseInt(match[2], 10)

  // Validate ranges
  if (mainCount < 5 || mainCount > 16 || euroCount < 2 || euroCount > 12) {
    return null
  }

  return { mainCount, euroCount }
}

/**
 * Formats main and euro counts into ticket type string
 * @param mainCount Number of main numbers
 * @param euroCount Number of euro numbers
 * @returns Ticket type string (e.g., "5x2")
 */
export function formatTicketType(mainCount: number, euroCount: number): string {
  return `${mainCount}x${euroCount}`
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
