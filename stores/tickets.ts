/**
 * Tickets Store - Centralized ticket management with true semantic actions
 * Owns all ticket-related data, API calls, and side effects
 * Implements the Semantic Action Pattern correctly
 */

import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { Ticket } from '~/schemas'
import type { AppConfig, SelectionMethod } from '~/schemas/urlConfig'
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

export type TicketPhase = 'fresh' | 'generating' | 'ready' | 'error'
export type AppState = 'FRESH' | 'SHARED'

export interface TicketConfig {
  mainCount: number
  euroCount: number
  ticketCount: number
  method: SelectionMethod
}

export interface TicketsState {
  phase: TicketPhase
  appState: AppState
  tickets: Ticket[]
  config: TicketConfig
  luckyCode: string
  error: string | null
  lastGenerated: number
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
    _urlUpdateTimer: undefined,
  })

  // Computed getters
  const hasTickets = computed(() => state.value.tickets.length > 0)
  const isGenerating = computed(() => state.value.phase === 'generating')
  const hasError = computed(() => !!state.value.error)
  const isShared = computed(() => state.value.appState === 'SHARED')

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

  const extractErrorMessage = (err: unknown): string => {
    if (typeof err === 'string') return err
    if (err instanceof Error) return err.message
    if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>
      const data = (e.data as Record<string, unknown> | undefined) ?? undefined
      const candidates = [
        data?.message,
        data?.statusMessage,
        e.statusText,
        e.message,
      ]
      for (const c of candidates) {
        if (typeof c === 'string' && c) return c
      }
    }
    return 'Failed to generate tickets.'
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
      ticketCount < 1 ||
      ticketCount > 500
    ) {
      state.value.error = 'Please enter a valid number of tickets (1-500).'
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
        algorithm: 'uniform' | 'weighted'
        seed?: string
      } = {
        ticketCount,
        mainCount,
        euroCount,
        algorithm: method === 'weighted' ? 'weighted' : 'uniform',
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
      addTransientError(`Generation failed: ${errorMessage}`, 5000)
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

    if (config.tickets && config.tickets >= 1 && config.tickets <= 500) {
      state.value.config.ticketCount = config.tickets
    }

    if (config.method) {
      state.value.config.method = config.method
    }

    // Handle lucky seed if present (shared configuration)
    if (config.lucky) {
      state.value.appState = 'SHARED'
      state.value.luckyCode = config.lucky

      // Show welcome message
      uiState.showWelcome(config.lucky, 12000)

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
    }, 250)
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

  // Return store interface
  return {
    // State (readonly)
    state: readonly(state),

    // Computed
    hasTickets,
    isGenerating,
    hasError,
    isShared,
    totalPrice,
    ticketTypeLabel,
    systemCost,

    // Actions
    generate,
    reset,
    share,
    applyUrlConfig,
    handleUrlConfiguration,
    updateConfig,
    setLuckyCode,
    clearError,

    // View models
    getDecoratedTickets,
  }
})

export type TicketsStore = ReturnType<typeof useTicketsStore>
