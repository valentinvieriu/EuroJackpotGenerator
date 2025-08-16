/**
 * Tickets Store - Centralized ticket management with true semantic actions
 * Owns all ticket-related data, API calls, and side effects
 * Implements the Semantic Action Pattern correctly
 */

import { defineStore } from 'pinia'
import { ref, computed, readonly, watch } from 'vue'
import type { Ticket, StatisticsData } from '~/schemas'
import type {
  AppConfig,
  SelectionMethod,
  FavoriteNumbers,
} from '~/schemas/urlConfig'
import { useSimulationStore } from './simulation'
import { useUIState, useTransientErrors } from '~/composables/useAppState'
import {
  encodeAppConfigToHash,
  decodeUrlHash,
  parseTicketType,
  formatTicketType,
  generateLuckyCode,
} from '~/utils/urlHash'
import { systemPrice } from '~/utils/pricing'
import { logger } from '~/utils/logger'
import {
  TICKET_COUNT_MIN,
  TICKET_COUNT_MAX,
  WELCOME_DISPLAY_MS,
  TRANSIENT_ERROR_MS,
  URL_DEBOUNCE_MS,
  MAIN_NUMBER_MIN,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MIN,
  EURO_NUMBER_MAX,
  FAVORITE_NUMBERS_MAX,
  MINIMUM_TICKETS_FOR_DELETION,
} from '~/utils/constants'
import { extractErrorMessage } from '~/utils/errors'

export type TicketPhase = 'fresh' | 'generating' | 'ready' | 'error'
export type AppState = 'FRESH' | 'SHARED'

export interface TicketConfig {
  mainCount: number
  euroCount: number
  ticketCount: number
  method: SelectionMethod
  favoriteNumbers?: FavoriteNumbers
}

export interface TicketsState {
  phase: TicketPhase
  appState: AppState
  tickets: Ticket[]
  config: TicketConfig
  luckyCode: string
  error: string | null
  lastGenerated: number
  frequencyData: StatisticsData | null
  isLoadingFrequencies: boolean
  frequencyError: string | null
  _urlUpdateTimer?: ReturnType<typeof setTimeout>
}

/**
 * Tickets store for centralized ticket management
 * Owns all ticket-related data and side effects
 */
export const useTicketsStore = defineStore('tickets', () => {
  // Default configuration
  const createDefaultConfig = (): TicketConfig => ({
    mainCount: 5,
    euroCount: 2,
    ticketCount: 1,
    method: 'weighted',
    favoriteNumbers: {
      mainNumbers: [],
      euroNumbers: [],
    },
  })

  // State
  const state = ref<TicketsState>({
    phase: 'fresh',
    appState: 'FRESH',
    tickets: [],
    config: createDefaultConfig(),
    luckyCode: '',
    error: null,
    lastGenerated: 0,
    frequencyData: null,
    isLoadingFrequencies: false,
    frequencyError: null,
    _urlUpdateTimer: undefined,
  })

  // Computed getters
  const hasTickets = computed(() => state.value.tickets.length > 0)
  const isGenerating = computed(() => state.value.phase === 'generating')
  const hasError = computed(() => !!state.value.error)
  const isShared = computed(() => state.value.appState === 'SHARED')

  const hasFavoriteNumbers = computed(() => {
    const favorites = state.value.config.favoriteNumbers
    return !!(favorites?.mainNumbers.length || favorites?.euroNumbers.length)
  })

  const totalPrice = computed(() => {
    const config = state.value.config
    const systemCost = systemPrice(config.mainCount, config.euroCount)
    return systemCost * config.ticketCount
  })

  const ticketTypeLabel = computed(() => {
    const { mainCount, euroCount } = state.value.config
    const isStandard = mainCount === 5 && euroCount === 2
    return isStandard
      ? `${mainCount} main + ${euroCount} Euro numbers (standard)`
      : `${mainCount} main + ${euroCount} Euro numbers`
  })

  const systemCost = computed(() => {
    const { mainCount, euroCount } = state.value.config
    return systemPrice(mainCount, euroCount)
  })

  // Frequency data computed getters
  const hasFrequencyData = computed(() => !!state.value.frequencyData)
  const hasFrequencyError = computed(() => !!state.value.frequencyError)
  const shouldShowFrequencies = computed(
    () => state.value.config.method === 'weighted'
  )

  const allMainNumbers = computed(() => {
    if (!state.value.frequencyData) return []
    return state.value.frequencyData.numbers
      .slice()
      .sort((a, b) => a.number - b.number) // Sort by number (1-50)
  })

  const allEuroNumbers = computed(() => {
    if (!state.value.frequencyData) return []
    return state.value.frequencyData.additionalNumbers
      .slice()
      .sort((a, b) => a.number - b.number) // Sort by number (1-12)
  })

  // Statistical analysis for frequency display
  const frequencyStats = computed(() => {
    if (!state.value.frequencyData) return null

    const totalMainNumbers = state.value.frequencyData.numbers.length
    const totalEuroNumbers = state.value.frequencyData.additionalNumbers.length

    // Calculate total selections (sum of all frequencies)
    const totalMainSelections = state.value.frequencyData.numbers.reduce(
      (sum, n) => sum + n.value,
      0
    )
    const totalEuroSelections =
      state.value.frequencyData.additionalNumbers.reduce(
        (sum, n) => sum + n.value,
        0
      )

    // Calculate total draws from total selections
    const totalDraws = totalMainSelections / MAIN_NUMBERS_COUNT

    // Expected frequency for each individual number
    const expectedMainFreq = totalMainSelections / totalMainNumbers
    const expectedEuroFreq = totalEuroSelections / totalEuroNumbers

    return {
      totalDraws: Math.round(totalDraws),
      expectedMainFreq: Math.round(expectedMainFreq),
      expectedEuroFreq: Math.round(expectedEuroFreq),
      mainNumberCount: totalMainNumbers,
      euroNumberCount: totalEuroNumbers,
      totalMainSelections,
      totalEuroSelections,
    }
  })

  // Dependencies
  const simulationStore = useSimulationStore()
  const uiState = useUIState()
  const { addError: addTransientError } = useTransientErrors()

  // Helper functions
  const clearError = () => {
    state.value.error = null
    if (state.value.phase === 'error') {
      state.value.phase = hasTickets.value ? 'ready' : 'fresh'
    }
  }

  const updateBrowserUrl = (config?: Partial<AppConfig> | null) => {
    if (typeof window === 'undefined') return

    if (config === null) {
      // Clear URL completely
      window.history.replaceState(null, '', window.location.pathname)
      return
    }

    const fullConfig: AppConfig = {
      system: formatTicketType(
        state.value.config.mainCount,
        state.value.config.euroCount
      ),
      tickets: state.value.config.ticketCount,
      method: state.value.config.method,
      ...(state.value.luckyCode && { lucky: state.value.luckyCode }),
      ...(state.value.config.favoriteNumbers?.mainNumbers.length && {
        fav_main: state.value.config.favoriteNumbers.mainNumbers.join(','),
      }),
      ...(state.value.config.favoriteNumbers?.euroNumbers.length && {
        fav_euro: state.value.config.favoriteNumbers.euroNumbers.join(','),
      }),
      ...config,
    }

    const hash = encodeAppConfigToHash(fullConfig)
    const newUrl = hash
      ? `${window.location.pathname}#${hash}`
      : window.location.pathname
    window.history.replaceState(null, '', newUrl)
  }

  // Semantic Actions

  /**
   * Generate tickets - owns the API call, state transitions, and business logic
   */
  const generate = async (): Promise<void> => {
    if (state.value.phase === 'generating') {
      logger.warn('Ticket generation already in progress')
      return
    }

    // Validate configuration
    const { mainCount, euroCount, ticketCount, method } = state.value.config
    if (
      !Number.isInteger(ticketCount) ||
      ticketCount < TICKET_COUNT_MIN ||
      ticketCount > TICKET_COUNT_MAX
    ) {
      state.value.error = `Please enter a valid number of tickets (${TICKET_COUNT_MIN}-${TICKET_COUNT_MAX}).`
      state.value.phase = 'error'
      return
    }

    logger.debug('TicketsStore: Starting ticket generation', {
      mainCount,
      euroCount,
      ticketCount,
      method,
      luckyCode: state.value.luckyCode || 'none',
    })

    // Set generating state
    state.value.phase = 'generating'
    state.value.error = null
    uiState.setLoading('generate')

    try {
      const runtimeConfig = useRuntimeConfig()
      const apiBaseUrl = runtimeConfig.public.apiBase

      const requestBody: {
        ticketCount: number
        mainCount: number
        euroCount: number
        algorithm: 'uniform' | 'weighted' | 'favorites' | 'unpopular'
        seed?: string
        favoriteNumbers?: FavoriteNumbers
      } = {
        ticketCount,
        mainCount,
        euroCount,
        algorithm:
          method === 'favorites'
            ? 'favorites'
            : method === 'weighted'
              ? 'weighted'
              : method === 'unpopular'
                ? 'unpopular'
                : 'uniform',
      }

      // Add favorite numbers if method is favorites
      if (method === 'favorites' && state.value.config.favoriteNumbers) {
        requestBody.favoriteNumbers = state.value.config.favoriteNumbers
      }

      // Add seed if we have one (for reproducible generation)
      if (state.value.luckyCode) {
        requestBody.seed = state.value.luckyCode
      }

      const generatedTickets = await $fetch<Ticket[]>(
        `${apiBaseUrl}/generate`,
        {
          method: 'POST',
          body: requestBody,
        }
      )

      // Success - update state
      state.value.tickets = generatedTickets
      state.value.phase = 'ready'
      state.value.lastGenerated = Date.now()

      logger.debug('TicketsStore: Ticket generation successful', {
        count: generatedTickets.length,
        totalLines: generatedTickets.reduce(
          (sum, t) => sum + (t.linesCount || 0),
          0
        ),
      })

      // Notify simulation store of new tickets
      simulationStore.generateTickets(generatedTickets)

      // Update URL to persist configuration
      updateBrowserUrl()
    } catch (err: unknown) {
      logger.error('TicketsStore: Ticket generation failed:', err)

      const errorMessage = extractErrorMessage(err)
      state.value.error = errorMessage
      state.value.phase = 'error'
      state.value.tickets = []

      // Also add to transient errors for user notification
      addTransientError(
        `Generation failed: ${errorMessage}`,
        TRANSIENT_ERROR_MS
      )
    } finally {
      uiState.setLoading(null)
    }
  }

  /**
   * Reset tickets - clears all ticket-related state and transitions to fresh
   */
  const reset = (): void => {
    logger.debug('TicketsStore: Resetting tickets')

    state.value.tickets = []
    state.value.phase = 'fresh'
    state.value.appState = 'FRESH'
    state.value.luckyCode = ''
    state.value.error = null

    // Notify simulation store of ticket reset
    simulationStore.resetTickets()

    // Clear URL completely for fresh state
    updateBrowserUrl(null)
  }

  /**
   * Share tickets - creates shareable URL with lucky code
   */
  const share = async (): Promise<void> => {
    try {
      let luckyCode: string

      if (state.value.appState === 'SHARED' && state.value.luckyCode) {
        // Re-share the original shared configuration
        luckyCode = state.value.luckyCode
      } else {
        // Create new lucky code for current configuration
        luckyCode = generateLuckyCode()
      }

      logger.debug('TicketsStore: Creating shareable configuration', {
        luckyCode,
      })

      // Show sharing dialog
      uiState.showSharing(luckyCode)

      // Copy to clipboard if user wants
      // Note: Actual clipboard action is handled by the UI component
    } catch (error) {
      logger.error(
        'TicketsStore: Failed to create shareable configuration:',
        error
      )
      addTransientError('Failed to create shareable link', 3000)
    }
  }

  /**
   * Apply URL configuration - restores state from URL hash
   */
  const applyUrlConfig = async (config: Partial<AppConfig>): Promise<void> => {
    logger.debug('TicketsStore: Applying URL configuration', config)

    // Apply configuration to state
    if (config.system) {
      const parsed = parseTicketType(config.system)
      if (parsed) {
        state.value.config.mainCount = parsed.mainCount
        state.value.config.euroCount = parsed.euroCount
      }
    }

    if (
      config.tickets &&
      config.tickets >= TICKET_COUNT_MIN &&
      config.tickets <= TICKET_COUNT_MAX
    ) {
      state.value.config.ticketCount = config.tickets
    }

    if (config.method) {
      state.value.config.method = config.method
    }

    // Handle favorite numbers if present
    if (config.fav_main || config.fav_euro) {
      if (!state.value.config.favoriteNumbers) {
        state.value.config.favoriteNumbers = {
          mainNumbers: [],
          euroNumbers: [],
        }
      }

      if (config.fav_main) {
        const mainNumbers = config.fav_main
          .split(',')
          .map((n) => Number.parseInt(n.trim(), 10))
          .filter(
            (n) =>
              !Number.isNaN(n) && n >= MAIN_NUMBER_MIN && n <= MAIN_NUMBER_MAX
          )
          .slice(0, FAVORITE_NUMBERS_MAX)
        state.value.config.favoriteNumbers.mainNumbers = mainNumbers.sort(
          (a, b) => a - b
        )
      }

      if (config.fav_euro) {
        const euroNumbers = config.fav_euro
          .split(',')
          .map((n) => Number.parseInt(n.trim(), 10))
          .filter(
            (n) =>
              !Number.isNaN(n) && n >= EURO_NUMBER_MIN && n <= EURO_NUMBER_MAX
          )
          .slice(0, FAVORITE_NUMBERS_MAX)
        state.value.config.favoriteNumbers.euroNumbers = euroNumbers.sort(
          (a, b) => a - b
        )
      }

      // Auto-switch to favorites method if favorites are present
      if (
        state.value.config.favoriteNumbers.mainNumbers.length > 0 ||
        state.value.config.favoriteNumbers.euroNumbers.length > 0
      ) {
        state.value.config.method = 'favorites'
      }
    }

    // Handle lucky seed if present (shared configuration)
    if (config.lucky) {
      state.value.appState = 'SHARED'
      state.value.luckyCode = config.lucky

      // Show welcome message
      uiState.showWelcome(config.lucky, WELCOME_DISPLAY_MS)

      // Automatically generate the tickets using the lucky code as seed
      await generate()
    } else {
      // No lucky seed - just restore form state
      state.value.appState = 'FRESH'
      state.value.luckyCode = ''
    }
  }

  /**
   * Handle URL configuration on mount or hash change
   */
  const handleUrlConfiguration = async (): Promise<void> => {
    if (typeof window === 'undefined') return

    const hash = window.location.hash
    if (!hash) {
      // No hash = fresh state
      state.value.appState = 'FRESH'
      return
    }

    // Try to decode configuration
    const config = decodeUrlHash(hash)
    if (config) {
      await applyUrlConfig(config)
      return
    }

    // Couldn't decode hash - treat as fresh
    state.value.appState = 'FRESH'
  }

  /**
   * Update configuration - for form changes that should persist to URL
   */
  const updateConfig = (updates: Partial<TicketConfig>): void => {
    state.value.config = { ...state.value.config, ...updates }

    // Debounced URL update to avoid history spam
    // Using a simple timeout approach
    clearTimeout(state.value._urlUpdateTimer)
    state.value._urlUpdateTimer = setTimeout(() => {
      if (state.value.appState === 'FRESH') {
        updateBrowserUrl()
      }
    }, URL_DEBOUNCE_MS)
  }

  /**
   * Set lucky code for shared configurations
   */
  const setLuckyCode = (
    luckyCode: string,
    appState: AppState = 'SHARED'
  ): void => {
    state.value.luckyCode = luckyCode
    state.value.appState = appState
  }

  /**
   * Add a favorite number
   */
  const addFavoriteNumber = (type: 'main' | 'euro', number: number): void => {
    if (!state.value.config.favoriteNumbers) {
      state.value.config.favoriteNumbers = { mainNumbers: [], euroNumbers: [] }
    }

    const favorites = state.value.config.favoriteNumbers
    const targetArray =
      type === 'main' ? favorites.mainNumbers : favorites.euroNumbers
    const minRange = type === 'main' ? MAIN_NUMBER_MIN : EURO_NUMBER_MIN
    const maxRange = type === 'main' ? MAIN_NUMBER_MAX : EURO_NUMBER_MAX

    // Validate number is in range
    if (number < minRange || number > maxRange) {
      logger.warn(
        `Invalid ${type} number: ${number} (range: ${minRange}-${maxRange})`
      )
      return
    }

    // Check if already exists
    if (targetArray.includes(number)) {
      logger.warn(`${type} number ${number} already in favorites`)
      return
    }

    // Check limit
    if (targetArray.length >= FAVORITE_NUMBERS_MAX) {
      logger.warn(
        `Maximum ${FAVORITE_NUMBERS_MAX} favorite ${type} numbers allowed`
      )
      return
    }

    // Add and sort
    targetArray.push(number)
    targetArray.sort((a, b) => a - b)

    logger.debug(`Added favorite ${type} number: ${number}`)

    // Update URL if not in shared mode
    if (state.value.appState === 'FRESH') {
      updateBrowserUrl()
    }
  }

  /**
   * Remove a favorite number
   */
  const removeFavoriteNumber = (
    type: 'main' | 'euro',
    number: number
  ): void => {
    if (!state.value.config.favoriteNumbers) return

    const favorites = state.value.config.favoriteNumbers
    const targetArray =
      type === 'main' ? favorites.mainNumbers : favorites.euroNumbers
    const index = targetArray.indexOf(number)

    if (index === -1) {
      logger.warn(`${type} number ${number} not found in favorites`)
      return
    }

    targetArray.splice(index, 1)
    logger.debug(`Removed favorite ${type} number: ${number}`)

    // Update URL if not in shared mode
    if (state.value.appState === 'FRESH') {
      updateBrowserUrl()
    }
  }

  /**
   * Clear favorite numbers
   */
  const clearFavoriteNumbers = (type?: 'main' | 'euro'): void => {
    if (!state.value.config.favoriteNumbers) return

    const favorites = state.value.config.favoriteNumbers

    if (type === 'main') {
      favorites.mainNumbers = []
    } else if (type === 'euro') {
      favorites.euroNumbers = []
    } else {
      favorites.mainNumbers = []
      favorites.euroNumbers = []
    }

    logger.debug(`Cleared favorite numbers: ${type || 'all'}`)

    // Update URL if not in shared mode
    if (state.value.appState === 'FRESH') {
      updateBrowserUrl()
    }
  }

  /**
   * Remove ticket - removes a specific ticket by ID and updates all related state
   */
  const removeTicket = (ticketId: number): void => {
    logger.debug('TicketsStore: Removing ticket', { ticketId })

    // Find the ticket to remove
    const ticketIndex = state.value.tickets.findIndex(
      (ticket) => ticket.id === ticketId
    )

    if (ticketIndex === -1) {
      logger.warn(`TicketsStore: Ticket with ID ${ticketId} not found`)
      return
    }

    // Remove the ticket from the array
    state.value.tickets.splice(ticketIndex, 1)

    // Update the ticket count in config to match actual count
    state.value.config.ticketCount = state.value.tickets.length

    logger.debug('TicketsStore: Ticket removed successfully', {
      ticketId,
      remainingTickets: state.value.tickets.length,
    })

    // If no tickets remain, reset to fresh state
    if (state.value.tickets.length <= MINIMUM_TICKETS_FOR_DELETION) {
      state.value.phase = 'fresh'
      state.value.error = null
      logger.debug('TicketsStore: No tickets remaining, reset to fresh state')
    }

    // Notify simulation store of ticket removal
    simulationStore.removeTicket(ticketId)

    // Update URL to persist configuration changes
    updateBrowserUrl()
  }

  /**
   * Get decorated tickets with simulation highlights
   */
  const getDecoratedTickets = (mode: 'single' | 'montecarlo') => {
    if (!hasTickets.value) return []

    const highlights = simulationStore.getHighlightsForMode(mode)
    const highlightMap = new Map(highlights.map((h) => [h.id, h]))

    return state.value.tickets
      .map((ticket) => {
        const highlight = highlightMap.get(ticket.id) || {
          id: ticket.id,
          winningMainNumbers: [],
          winningEuroNumbers: [],
          winClassCounts: {},
          winClass: undefined,
        }

        // Merge highlight properties directly into ticket object
        // This ensures TicketItem.vue can access winningMainNumbers, winningEuroNumbers, etc. directly
        return {
          ...ticket,
          winningMainNumbers: highlight.winningMainNumbers,
          winningEuroNumbers: highlight.winningEuroNumbers,
          winClassCounts: highlight.winClassCounts,
          winClass: highlight.winClass,
        }
      })
      .sort((a, b) => {
        // Sort winning tickets to the top for better UX
        const aWinClass = a.winClass ?? 999
        const bWinClass = b.winClass ?? 999
        // If win classes are the same, sort by original ticket ID
        return aWinClass === bWinClass ? a.id - b.id : aWinClass - bWinClass
      })
  }

  /**
   * Fetch frequency data for weighted number generation display
   */
  const fetchFrequencyData = async (): Promise<void> => {
    if (state.value.isLoadingFrequencies) {
      logger.warn('Frequency data fetch already in progress')
      return
    }

    logger.debug('TicketsStore: Starting frequency data fetch')

    // Set loading state
    state.value.isLoadingFrequencies = true
    state.value.frequencyError = null

    try {
      const runtimeConfig = useRuntimeConfig()
      const apiBaseUrl = runtimeConfig.public.apiBase

      const frequencyData = await $fetch<StatisticsData | null>(
        `${apiBaseUrl}/frequencies`,
        {
          method: 'GET',
        }
      )

      // Success - update state
      state.value.frequencyData = frequencyData
      state.value.isLoadingFrequencies = false

      logger.debug('TicketsStore: Frequency data fetch successful', {
        hasData: !!frequencyData,
        mainNumbersCount: frequencyData?.numbers.length,
        euroNumbersCount: frequencyData?.additionalNumbers.length,
      })
    } catch (err: unknown) {
      logger.error('TicketsStore: Frequency data fetch failed:', err)

      const errorMessage = extractErrorMessage(err)
      state.value.frequencyError = errorMessage
      state.value.isLoadingFrequencies = false

      // Set display error for user
      addTransientError(
        'Failed to load frequency data. Using default weighting.',
        TRANSIENT_ERROR_MS
      )
    }
  }

  // Watch for method changes to auto-fetch frequency data
  watch(
    () => state.value.config.method,
    async (newMethod) => {
      // Skip auto-fetch in test environment or when no runtime config available
      if (
        process.env.NODE_ENV === 'test' ||
        typeof useRuntimeConfig === 'undefined'
      ) {
        return
      }

      if (
        newMethod === 'weighted' &&
        !state.value.frequencyData &&
        !state.value.isLoadingFrequencies
      ) {
        logger.debug('Auto-fetching frequency data for weighted method')
        try {
          await fetchFrequencyData()
        } catch (error) {
          // Silently fail for auto-fetch to avoid disrupting user flow
          logger.warn('Auto-fetch of frequency data failed:', error)
        }
      }
    },
    { immediate: false } // Don't run immediately to avoid test issues
  )

  // Return store interface
  return {
    // State (readonly)
    state: readonly(state),

    // Computed
    hasTickets,
    isGenerating,
    hasError,
    isShared,
    hasFavoriteNumbers,
    totalPrice,
    ticketTypeLabel,
    systemCost,
    hasFrequencyData,
    hasFrequencyError,
    shouldShowFrequencies,
    allMainNumbers,
    allEuroNumbers,
    frequencyStats,

    // Actions
    generate,
    reset,
    share,
    applyUrlConfig,
    handleUrlConfiguration,
    updateConfig,
    setLuckyCode,
    clearError,
    removeTicket,
    fetchFrequencyData,

    // Favorite Numbers Actions
    addFavoriteNumber,
    removeFavoriteNumber,
    clearFavoriteNumbers,

    // View models
    getDecoratedTickets,
  }
})

export type TicketsStore = ReturnType<typeof useTicketsStore>
