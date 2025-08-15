/**
 * Simulation Store - Manages Monte Carlo simulation state
 * Centralizes complex simulation state management with type safety
 */

import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type {
  BatchSimulationResult,
  BatchSimulationRequest,
  Ticket,
  EurojackpotHistoricOdds,
} from '~/schemas'
import { parseNdjsonEvent } from '~/utils/ndjsonParser'
import { buildTicketHighlightUpdates } from '~/utils/ticketHighlighting'
import { buildOddsMap } from '~/utils/payout'
import { playWinSound } from '~/utils/audioUtils'
import { useAudioState } from '~/composables/useAppState'
import { useOddsStore } from './odds'
import { LARGE_SIMULATION_THRESHOLD } from '~/utils/constants'
import { logger } from '~/utils/logger'

// Helper function to normalize winsByClass from string keys to number keys
const normalizeWinsByClass = (
  stringKeyed: Record<string, number>
): Record<number, number> =>
  Object.fromEntries(
    Object.entries(stringKeyed).map(([k, v]) => [Number(k), v])
  )

export type SimulationPhase =
  | 'config'
  | 'running'
  | 'results'
  | 'cancelled'
  | 'error'

export interface SimulationProgress {
  currentSimulation: number
  totalSimulations: number
  progressPercentage: number
  elapsedTime: number
  estimatedTimeRemaining: string | null
  partialResults: {
    simulationsCompleted: number
    totalWins: number
    winPercentage: number
    currentROI: number
    netProfit: number
    maxWin: number
    winsByClass: Record<number, number>
  } | null
}

export interface SimulationConfig {
  simulationCount: number
  batchSize: number
}

export type SingleDrawPhase = 'idle' | 'running' | 'results' | 'error'

export interface SingleDrawResults {
  totalWinnings: number
  netProfit: number
  roiPercentage: number
  timestamp: number
  ticketHighlights: Array<{
    id: number
    winningMainNumbers: number[]
    winningEuroNumbers: number[]
    winClassCounts: Record<number, number>
    winClass?: number
  }>
}

export interface SingleDrawState {
  phase: SingleDrawPhase
  winningNumbers: {
    mainNumbers: number[]
    euroNumbers: number[]
  } | null
  oddsData: EurojackpotHistoricOdds | null
  results: SingleDrawResults | null
  error: string | null
}

export interface SimulationState {
  phase: SimulationPhase
  config: SimulationConfig | null
  progress: SimulationProgress | null
  results: BatchSimulationResult | null
  error: string | null
  startTime: number
  canCancel: boolean
  abortController: AbortController | null
  currentTickets: Ticket[] | null
  singleDraw: SingleDrawState
}

/**
 * Simulation store for managing Monte Carlo simulation state
 * Provides centralized state management for complex simulation workflows
 */
export const useSimulationStore = defineStore('simulation', () => {
  // Default single draw state
  const createDefaultSingleDrawState = (): SingleDrawState => ({
    phase: 'idle',
    winningNumbers: null,
    oddsData: null,
    results: null,
    error: null,
  })

  // State
  const state = ref<SimulationState>({
    phase: 'config',
    config: null,
    progress: null,
    results: null,
    error: null,
    startTime: 0,
    canCancel: false,
    abortController: null,
    currentTickets: null,
    singleDraw: createDefaultSingleDrawState(),
  })

  // Computed getters
  const isRunning = computed(() => state.value.phase === 'running')
  const hasResults = computed(
    () => state.value.phase === 'results' && !!state.value.results
  )
  const hasError = computed(
    () => state.value.phase === 'error' && !!state.value.error
  )
  const canStart = computed(
    () => state.value.phase === 'config' && !!state.value.config
  )

  // Single Draw computed getters
  const isSingleDrawRunning = computed(
    () => state.value.singleDraw.phase === 'running'
  )
  const hasSingleDrawResults = computed(
    () =>
      state.value.singleDraw.phase === 'results' &&
      !!state.value.singleDraw.results
  )
  const hasSingleDrawError = computed(
    () =>
      state.value.singleDraw.phase === 'error' && !!state.value.singleDraw.error
  )

  // Tickets are now managed explicitly without automatic resets

  // Actions
  const setConfig = (config: SimulationConfig) => {
    state.value.config = config
    state.value.phase = 'config'
    clearError()
  }

  // Semantic actions that encode business logic

  const generateTickets = (tickets: Ticket[]) => {
    logger.debug('SimulationStore: User generated new tickets')
    state.value.currentTickets = tickets

    // Business logic: Reset Monte Carlo when user generates new tickets
    if (shouldResetOnTicketChange()) {
      logger.debug(
        'SimulationStore: Resetting Monte Carlo for new user-generated tickets'
      )
      resetToConfig()
    }

    // Business logic: PRESERVE Single Draw and re-highlight with new tickets
    logger.debug(`Single Draw current phase: ${state.value.singleDraw.phase}`)
    const shouldReset = shouldResetSingleDrawOnTicketChange()
    logger.debug(`shouldResetSingleDrawOnTicketChange returned: ${shouldReset}`)

    if (shouldReset) {
      logger.debug(
        'SimulationStore: Resetting Single Draw for new user-generated tickets'
      )
      resetSingleDraw()
    } else if (state.value.singleDraw.phase === 'results') {
      // Re-calculate highlights for new tickets using preserved winning numbers
      logger.debug(
        'SimulationStore: Re-highlighting new tickets against preserved Single Draw results'
      )
      reHighlightSingleDrawResults()
    } else {
      logger.debug(
        `SimulationStore: Single Draw phase is '${state.value.singleDraw.phase}', no action needed`
      )
    }
  }

  const resetTickets = () => {
    logger.debug('SimulationStore: User reset tickets')
    state.value.currentTickets = []

    // Business logic: Always reset both simulations when user explicitly resets
    resetToConfig() // Reset Monte Carlo
    resetSingleDraw() // Reset Single Draw
  }

  const syncTickets = (tickets: Ticket[]) => {
    logger.debug('SimulationStore: Syncing tickets from component lifecycle')
    // Just update tickets without reset logic - this is for component sync
    state.value.currentTickets = tickets
  }

  const shouldResetOnTicketChange = (): boolean => {
    // Business rule: Reset simulation when user changes tickets and we have results/errors
    return state.value.phase === 'results' || state.value.phase === 'error'
  }

  const shouldResetSingleDrawOnTicketChange = (): boolean => {
    // Business rule: PRESERVE Single Draw results when tickets change
    // Only reset on explicit reset action, not on ticket changes
    const shouldReset = false
    logger.debug(
      `shouldResetSingleDrawOnTicketChange: returning ${shouldReset}`
    )
    return shouldReset
  }

  // Single Draw Actions

  const runSingleDraw = async (totalPrice: number): Promise<void> => {
    if (state.value.singleDraw.phase === 'running') {
      logger.warn('Single draw already running')
      return
    }

    if (
      !state.value.currentTickets ||
      state.value.currentTickets.length === 0
    ) {
      logger.warn('No tickets available for single draw')
      return
    }

    // Set running state
    state.value.singleDraw = {
      phase: 'running',
      winningNumbers: null,
      oddsData: null,
      results: null,
      error: null,
    }

    try {
      const runtimeConfig = useRuntimeConfig()
      const apiBaseUrl = runtimeConfig.public.apiBase
      const oddsStore = useOddsStore()

      // Make parallel API calls - simulation and odds
      const [simResponse, winDataResponse] = await Promise.all([
        $fetch<{
          draw: { mainNumbers: number[]; euroNumbers: number[] }
          meta: Record<string, unknown>
        }>(`${apiBaseUrl}/simulate`),
        oddsStore.fetchOdds(), // Use centralized odds store
      ])

      // Validate simulation result
      if (!simResponse.draw?.mainNumbers || !simResponse.draw?.euroNumbers) {
        throw new Error('Invalid simulation result received from API.')
      }

      const winningNumbers = {
        mainNumbers: simResponse.draw.mainNumbers,
        euroNumbers: simResponse.draw.euroNumbers,
      }

      // Calculate ticket highlights
      const ticketHighlights = buildTicketHighlightUpdates(
        state.value.currentTickets,
        winningNumbers.mainNumbers,
        winningNumbers.euroNumbers
      )

      // Calculate total winnings
      let totalWinnings = 0
      if (winDataResponse?.eurojackpotOdds?.length) {
        const oddsMap = buildOddsMap(winDataResponse)
        for (const update of ticketHighlights) {
          for (const [clsStr, count] of Object.entries(update.winClassCounts)) {
            const amount = oddsMap.get(Number(clsStr)) ?? 0
            totalWinnings += amount * (count as number)
          }
        }
      }

      // Calculate ROI
      const netProfit = totalWinnings - totalPrice
      const roiPercentage =
        totalPrice > 0
          ? (netProfit / totalPrice) * 100
          : totalWinnings > 0
            ? Infinity
            : 0

      // Set results state
      state.value.singleDraw = {
        phase: 'results',
        winningNumbers,
        oddsData: winDataResponse,
        results: {
          totalWinnings: Number(totalWinnings.toFixed(2)),
          netProfit: Number(netProfit.toFixed(2)),
          roiPercentage,
          timestamp: Date.now(),
          ticketHighlights,
        },
        error: null,
      }

      // Play win sound (respect user audio preferences)
      const { audioEnabled, winSoundLevel } = useAudioState()
      if (audioEnabled.value && winSoundLevel.value !== 'none') {
        // Map sound level to volume multiplier
        const volumeMap = {
          low: 0.3,
          medium: 0.7,
          high: 1.0,
          none: 0.0, // Should never reach this due to the check above
        }
        const volumeMultiplier = volumeMap[winSoundLevel.value]
        playWinSound(totalWinnings, totalPrice, volumeMultiplier)
      }
    } catch (error: unknown) {
      logger.error('Single draw error:', error)

      let errorMessage = 'An error occurred during simulation.'
      if (typeof error === 'object' && error !== null) {
        const anyErr = error as Record<string, unknown>
        errorMessage =
          ((anyErr.data as Record<string, unknown> | undefined)
            ?.message as string) ||
          (anyErr.message as string | undefined) ||
          errorMessage
      }

      state.value.singleDraw = {
        phase: 'error',
        winningNumbers: null,
        oddsData: null,
        results: null,
        error: String(errorMessage),
      }
    }
  }

  const resetSingleDraw = () => {
    logger.debug('SimulationStore: Resetting single draw')
    state.value.singleDraw = createDefaultSingleDrawState()
  }

  const reHighlightSingleDrawResults = () => {
    // Re-calculate highlights for current tickets using preserved winning numbers and odds
    if (
      !state.value.currentTickets ||
      state.value.currentTickets.length === 0 ||
      !state.value.singleDraw.winningNumbers ||
      !state.value.singleDraw.oddsData
    ) {
      logger.warn(
        'Cannot re-highlight: missing tickets, winning numbers, or odds data'
      )
      return
    }

    const { winningNumbers, oddsData } = state.value.singleDraw

    // Re-calculate ticket highlights with new tickets
    const ticketHighlights = buildTicketHighlightUpdates(
      state.value.currentTickets,
      winningNumbers.mainNumbers,
      winningNumbers.euroNumbers
    )

    // Re-calculate total winnings with new tickets
    let totalWinnings = 0
    if (oddsData?.eurojackpotOdds?.length) {
      const oddsMap = buildOddsMap(oddsData)
      for (const update of ticketHighlights) {
        for (const [clsStr, count] of Object.entries(update.winClassCounts)) {
          const amount = oddsMap.get(Number(clsStr)) ?? 0
          totalWinnings += amount * (count as number)
        }
      }
    }

    // Calculate total ticket price for new tickets
    const totalPrice = state.value.currentTickets.reduce(
      (sum, ticket) => sum + (ticket.linesCount || 0) * 2.0, // €2.00 per line
      0
    )

    // Re-calculate ROI
    const netProfit = totalWinnings - totalPrice
    const roiPercentage =
      totalPrice > 0
        ? (netProfit / totalPrice) * 100
        : totalWinnings > 0
          ? Infinity
          : 0

    // Update results with new calculations while preserving winning numbers and odds
    state.value.singleDraw.results = {
      totalWinnings: Number(totalWinnings.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      roiPercentage,
      timestamp: Date.now(), // Update timestamp to show when re-calculated
      ticketHighlights,
    }

    logger.debug(
      `Re-highlighted ${state.value.currentTickets.length} tickets against preserved winning numbers`
    )
  }

  const resetToConfig = () => {
    // Cancel any running simulation first
    if (state.value.phase === 'running') {
      cancelSimulation()
    }

    // Reset to config state while preserving config and tickets
    state.value = {
      ...state.value,
      phase: 'config',
      progress: null,
      results: null,
      error: null,
      startTime: 0,
      canCancel: false,
      abortController: null,
      // Preserve: config, currentTickets
    }
  }

  const startSimulation = async (
    tickets: Ticket[],
    costPerSimulation: number,
    config: SimulationConfig
  ): Promise<void> => {
    if (state.value.phase === 'running') {
      logger.warn('Simulation already running')
      return
    }

    // Reset state for simulation start
    state.value = {
      phase: 'running',
      config,
      currentTickets: tickets, // Store tickets in state for fingerprint tracking
      progress: {
        currentSimulation: 0,
        totalSimulations: config.simulationCount,
        progressPercentage: 0,
        elapsedTime: 0,
        estimatedTimeRemaining: null,
        partialResults: null,
      },
      results: null,
      error: null,
      startTime: Date.now(),
      canCancel: true,
      abortController: new AbortController(),
      singleDraw: state.value.singleDraw, // Preserve single draw state during Monte Carlo
    }

    try {
      const runtimeConfig = useRuntimeConfig()
      const apiBaseUrl = runtimeConfig.public.apiBase

      const request: BatchSimulationRequest = {
        tickets: tickets.map((t) => ({
          id: t.id,
          mainNumbers: t.mainNumbers,
          euroNumbers: t.euroNumbers,
          linesCount: t.linesCount,
        })),
        simulationCount: config.simulationCount,
        batchSize: config.batchSize,
        includeIndividualResults: config.simulationCount <= 1000,
      }

      // Use Nuxt $fetch to request NDJSON streaming from the API
      const stream = await $fetch<ReadableStream>(
        `${apiBaseUrl}/batchSimulate`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/x-ndjson',
            'Content-Type': 'application/json',
          },
          body: request,
          // Request a ReadableStream back for progressive updates
          responseType: 'stream',
          signal: state.value.abortController!.signal,
        }
      )

      // Process the NDJSON stream for progress and final result
      await processNDJSONStream(stream)
    } catch (error: unknown) {
      if (
        typeof (error as { name?: string }).name === 'string' &&
        (error as { name?: string }).name === 'AbortError'
      ) {
        state.value.phase = 'cancelled'
      } else {
        state.value.phase = 'error'
        state.value.error = extractErrorMessage(error)
      }
    } finally {
      state.value.canCancel = false
      state.value.abortController = null
    }
  }

  const cancelSimulation = () => {
    if (state.value.abortController && state.value.canCancel) {
      state.value.abortController.abort()
      state.value.phase = 'cancelled'
      state.value.canCancel = false
    }
  }

  const resetSimulation = () => {
    // Cancel any running simulation first
    if (state.value.phase === 'running') {
      cancelSimulation()
    }

    state.value = {
      phase: 'config',
      config: state.value.config, // Keep config for reuse
      currentTickets: null, // Clear tickets for full reset
      progress: null,
      results: null,
      error: null,
      startTime: 0,
      canCancel: false,
      abortController: null,
      singleDraw: createDefaultSingleDrawState(), // Reset single draw state too
    }
  }

  const clearError = () => {
    state.value.error = null
    if (state.value.phase === 'error') {
      state.value.phase = 'config'
    }
  }

  // Helper function to process NDJSON stream
  const processNDJSONStream = async (stream: ReadableStream): Promise<void> => {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        let idx: number
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx).trim()
          buffer = buffer.slice(idx + 1)
          if (!line) continue
          try {
            const raw = JSON.parse(line)
            const event = parseNdjsonEvent(raw)
            if (event) {
              if (event.type === 'progress') {
                updateProgress(event.progress, event.summary)
              } else if (event.type === 'result') {
                setResults(event.result)
                state.value.phase = 'results'
                buffer = ''
                return
              } else if (event.type === 'error') {
                state.value.phase = 'error'
                state.value.error = event.error || 'Simulation stream error'
                buffer = ''
                return
              }
            }
          } catch (parseError) {
            logger.warn('Failed to parse NDJSON line:', parseError)
          }
        }
      }
      // Flush any trailing line (optional)
      const tail = buffer.trim()
      if (tail) {
        try {
          const raw = JSON.parse(tail)
          const event = parseNdjsonEvent(raw)
          if (event) {
            if (event.type === 'result') {
              setResults(event.result)
              state.value.phase = 'results'
            } else if (event.type === 'error') {
              state.value.phase = 'error'
              state.value.error = event.error || 'Simulation stream error'
            }
          }
        } catch {
          // Ignore incomplete tail
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // Removed broad normalization: server now guarantees zod-validated NDJSON.
  // Retained minimal fallback in processNDJSONStream for progress/result/error.

  const updateProgress = (
    progress: {
      currentSimulation: number
      totalSimulations: number
      progressPercentage: number
      estimatedTimeRemaining?: string | null
      canCancel: boolean
    },
    summary: {
      winDistribution: {
        winsByClass: Record<string, number>
        totalWins: number
        winPercentage: number
      }
      roiPercentage: number
      netProfit: number
      maxWin: number
    }
  ) => {
    if (!state.value.progress) return

    const now = Date.now()
    const elapsed = now - state.value.startTime

    const winsByClass = summary?.winDistribution?.winsByClass
      ? normalizeWinsByClass(summary.winDistribution.winsByClass)
      : {}

    state.value.progress = {
      currentSimulation: progress.currentSimulation,
      totalSimulations: progress.totalSimulations,
      progressPercentage: progress.progressPercentage,
      elapsedTime: elapsed,
      estimatedTimeRemaining: calculateETA(
        progress.progressPercentage,
        elapsed
      ),
      partialResults: summary
        ? {
            simulationsCompleted: progress.currentSimulation,
            totalWins: summary.winDistribution?.totalWins || 0,
            winPercentage: summary.winDistribution?.winPercentage || 0,
            currentROI: summary.roiPercentage || 0,
            netProfit: summary.netProfit || 0,
            maxWin: summary.maxWin || 0,
            winsByClass,
          }
        : null,
    }
  }

  const setResults = (results: BatchSimulationResult) => {
    state.value.results = results
    state.value.progress = null // Clear progress when results are available
  }

  // Centralized Highlighting Functions

  /**
   * Returns Single Draw highlights (computed from current state)
   */
  const deriveSingleDrawHighlights = computed(() => {
    return state.value.singleDraw.results?.ticketHighlights || []
  })

  /**
   * Derives Monte Carlo highlights from highlighting data using optimized algorithm
   */
  const deriveMonteCarloHighlights = (
    highlightingData: {
      ticketStats: Record<
        number,
        {
          totalWins: number
          mainNumberFrequency: Record<number, number>
          euroNumberFrequency: Record<number, number>
          winClassCounts: Record<number, number>
        }
      >
    },
    totalSimulations: number
  ): Array<{
    id: number
    winningMainNumbers: number[]
    winningEuroNumbers: number[]
    winClassCounts: Record<number, number>
    winClass?: number
  }> => {
    if (!state.value.currentTickets) return []

    return state.value.currentTickets.map((ticket) => {
      const stats = highlightingData.ticketStats[ticket.id]
      if (!stats) {
        return {
          id: ticket.id,
          winningMainNumbers: [],
          winningEuroNumbers: [],
          winClassCounts: {},
          winClass: undefined,
        }
      }

      // SIMPLE & PRACTICAL highlighting: Show numbers that actually contributed to wins
      // Adaptive highlighting: stricter for large simulations to avoid everything being highlighted
      const isLargeSimulation = totalSimulations >= LARGE_SIMULATION_THRESHOLD

      // For large simulations, use higher threshold to show only standout performers
      // For small simulations (like 100 draws), be much more lenient to show any meaningful wins
      const minWinThreshold = isLargeSimulation
        ? Math.max(5, Math.floor(stats.totalWins * 0.15)) // 15% of wins for large sims
        : 1 // For small simulations, show any number that won at least once

      // Highlight any number that appeared in winning combinations above threshold
      const winningMainNumbers = ticket.mainNumbers.filter(
        (n: number) => (stats.mainNumberFrequency[n] || 0) >= minWinThreshold
      )
      const winningEuroNumbers = ticket.euroNumbers.filter(
        (n: number) => (stats.euroNumberFrequency[n] || 0) >= minWinThreshold
      )

      // Show ALL win classes that have any wins at all (no filtering)
      const significantWinClasses = normalizeWinsByClass(stats.winClassCounts)

      const winClass =
        Object.keys(significantWinClasses).length > 0
          ? Object.keys(significantWinClasses)
              .map(Number)
              .sort((a, b) => a - b)[0]
          : undefined

      return {
        id: ticket.id,
        winningMainNumbers,
        winningEuroNumbers,
        winClassCounts: significantWinClasses, // Show all win classes
        winClass,
      }
    })
  }

  /**
   * Derives Monte Carlo highlights using individual simulation results (simplified fallback)
   * Note: This provides basic highlighting based on number frequency across simulations
   */
  const deriveMonteCarloHighlightsFromIndividual = (
    individualResults: Array<{
      simulationIndex: number
      winningNumbers: { mainNumbers: number[]; euroNumbers: number[] }
      totalWinnings: number
      netProfit: number
      winsByClass: Record<string, number>
    }>
  ): Array<{
    id: number
    winningMainNumbers: number[]
    winningEuroNumbers: number[]
    winClassCounts: Record<number, number>
    winClass?: number
  }> => {
    if (!state.value.currentTickets) return []

    // Track how often each number appeared in winning simulations per ticket
    const ticketNumberFrequency = new Map<
      number,
      {
        mainNumbers: Map<number, number>
        euroNumbers: Map<number, number>
        totalMatches: number
      }
    >()

    // Initialize tracking for each ticket
    state.value.currentTickets.forEach((ticket) => {
      ticketNumberFrequency.set(ticket.id, {
        mainNumbers: new Map(),
        euroNumbers: new Map(),
        totalMatches: 0,
      })
    })

    // Analyze each simulation
    individualResults.forEach((simResult) => {
      if (!simResult.winningNumbers) return

      const simMain = simResult.winningNumbers.mainNumbers
      const simEuro = simResult.winningNumbers.euroNumbers

      // For each ticket, track which of its numbers matched in this simulation
      state.value.currentTickets!.forEach((ticket) => {
        const stats = ticketNumberFrequency.get(ticket.id)!

        // Check which ticket numbers matched the winning numbers
        const matchingMain = ticket.mainNumbers.filter((n) =>
          simMain.includes(n)
        )
        const matchingEuro = ticket.euroNumbers.filter((n) =>
          simEuro.includes(n)
        )

        // If this ticket had any matches, count the frequency
        if (matchingMain.length > 0 || matchingEuro.length > 0) {
          stats.totalMatches += 1

          matchingMain.forEach((num) => {
            stats.mainNumbers.set(num, (stats.mainNumbers.get(num) || 0) + 1)
          })

          matchingEuro.forEach((num) => {
            stats.euroNumbers.set(num, (stats.euroNumbers.get(num) || 0) + 1)
          })
        }
      })
    })

    // Apply highlighting based on frequency
    return state.value.currentTickets.map((ticket) => {
      const stats = ticketNumberFrequency.get(ticket.id)!

      // Use a simple threshold: show numbers that matched in at least 10% of simulations
      const minFrequency = Math.max(
        1,
        Math.floor(individualResults.length * 0.1)
      )

      const winningMainNumbers = ticket.mainNumbers.filter(
        (n: number) => (stats.mainNumbers.get(n) || 0) >= minFrequency
      )
      const winningEuroNumbers = ticket.euroNumbers.filter(
        (n: number) => (stats.euroNumbers.get(n) || 0) >= minFrequency
      )

      return {
        id: ticket.id,
        winningMainNumbers,
        winningEuroNumbers,
        winClassCounts: {}, // Cannot derive win class counts from individual results structure
        winClass: undefined,
      }
    })
  }

  /**
   * Derives minimal Monte Carlo highlights when only win distribution is available
   */
  const deriveMonteCarloHighlightsMinimal = (): Array<{
    id: number
    winningMainNumbers: number[]
    winningEuroNumbers: number[]
    winClassCounts: Record<number, number>
    winClass?: number
  }> => {
    if (!state.value.currentTickets) return []

    // Without individual results, we can only show aggregate win data
    return state.value.currentTickets.map((ticket) => ({
      id: ticket.id,
      winningMainNumbers: [], // No specific numbers to highlight
      winningEuroNumbers: [], // No specific numbers to highlight
      winClassCounts: {}, // Could potentially estimate from results.winDistribution
      winClass: undefined,
    }))
  }

  /**
   * Returns highlights for Single Draw mode
   */
  const getCurrentSingleDrawHighlights = () => {
    if (hasSingleDrawResults.value) {
      return deriveSingleDrawHighlights.value
    }
    return []
  }

  /**
   * Returns highlights for Monte Carlo mode
   */
  const getCurrentMonteCarloHighlights = () => {
    if (hasResults.value && state.value.results) {
      const results = state.value.results

      // Use optimized highlighting data (preferred method)
      if (results.highlightingData) {
        return deriveMonteCarloHighlights(
          results.highlightingData,
          results.totalSimulations
        )
      }

      // Fallback: use individual results if available (legacy support)
      if (results.individualResults && results.individualResults.length > 0) {
        return deriveMonteCarloHighlightsFromIndividual(
          results.individualResults
        )
      }

      // Last resort: minimal highlighting
      return deriveMonteCarloHighlightsMinimal()
    }
    return []
  }

  /**
   * Returns highlights for the specified mode
   */
  const getHighlightsForMode = (mode: 'single' | 'montecarlo') => {
    if (mode === 'single') {
      return getCurrentSingleDrawHighlights()
    } else {
      return getCurrentMonteCarloHighlights()
    }
  }

  /**
   * Returns tickets decorated with highlights for the specified mode
   */
  const getDecoratedTickets = (mode: 'single' | 'montecarlo') => {
    if (!state.value.currentTickets) return []

    const highlights = getHighlightsForMode(mode)
    const highlightMap = new Map(
      highlights.map((h: { id: number }) => [h.id, h])
    )

    return state.value.currentTickets.map((ticket) => ({
      ...ticket,
      highlights: highlightMap.get(ticket.id) || {
        id: ticket.id,
        winningMainNumbers: [],
        winningEuroNumbers: [],
        winClassCounts: {},
        winClass: undefined,
      },
    }))
  }

  // Utility functions
  const calculateETA = (
    progressPercentage: number,
    elapsedMs: number
  ): string | null => {
    if (progressPercentage <= 0) return null

    const totalEstimatedMs = (elapsedMs / progressPercentage) * 100
    const remainingMs = totalEstimatedMs - elapsedMs

    if (remainingMs <= 0) return null

    const remainingSeconds = Math.ceil(remainingMs / 1000)

    if (remainingSeconds < 60) {
      return `${remainingSeconds}s`
    } else if (remainingSeconds < 3600) {
      const minutes = Math.ceil(remainingSeconds / 60)
      return `${minutes}m`
    } else {
      const hours = Math.floor(remainingSeconds / 3600)
      const minutes = Math.ceil((remainingSeconds % 3600) / 60)
      return `${hours}h ${minutes}m`
    }
  }

  const extractErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') return error
    if (error instanceof Error) return error.message
    if (error && typeof error === 'object') {
      const e = error as Record<string, unknown>
      if (
        e.data &&
        typeof e.data === 'object' &&
        (e.data as Record<string, unknown>).message
      ) {
        return String((e.data as Record<string, unknown>).message)
      }
      if (typeof e.statusText === 'string') return e.statusText
    }
    return 'Simulation failed with unknown error'
  }

  // Return store interface
  return {
    // State
    state: readonly(state),

    // Computed
    isRunning,
    hasResults,
    hasError,
    canStart,

    // Single Draw computed
    isSingleDrawRunning,
    hasSingleDrawResults,
    hasSingleDrawError,

    // Centralized Highlighting
    deriveSingleDrawHighlights,
    deriveMonteCarloHighlights,
    deriveMonteCarloHighlightsFromIndividual,
    deriveMonteCarloHighlightsMinimal,
    getCurrentSingleDrawHighlights,
    getCurrentMonteCarloHighlights,
    getHighlightsForMode,
    getDecoratedTickets,

    // Actions
    setConfig,
    generateTickets,
    resetTickets,
    syncTickets,
    startSimulation,
    cancelSimulation,
    resetSimulation,
    resetToConfig,
    clearError,

    // Single Draw actions
    runSingleDraw,
    resetSingleDraw,
    reHighlightSingleDrawResults,
  }
})

export type SimulationStore = ReturnType<typeof useSimulationStore>
