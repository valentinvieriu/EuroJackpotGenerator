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
} from '~/schemas'
import { parseNdjsonEvent } from '~/utils/ndjsonParser'

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
}

/**
 * Simulation store for managing Monte Carlo simulation state
 * Provides centralized state management for complex simulation workflows
 */
export const useSimulationStore = defineStore('simulation', () => {
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

  // Tickets are now managed explicitly without automatic resets

  // Actions
  const setConfig = (config: SimulationConfig) => {
    state.value.config = config
    state.value.phase = 'config'
    clearError()
  }

  // Semantic actions that encode business logic

  const generateTickets = (tickets: Ticket[]) => {
    console.log('SimulationStore: User generated new tickets')
    state.value.currentTickets = tickets

    // Business logic: Reset simulation when user generates new tickets
    if (shouldResetOnTicketChange()) {
      console.log(
        'SimulationStore: Resetting simulation for new user-generated tickets'
      )
      resetToConfig()
    }
  }

  const resetTickets = () => {
    console.log('SimulationStore: User reset tickets')
    state.value.currentTickets = []

    // Business logic: Always reset simulation when user explicitly resets
    resetToConfig()
  }

  const syncTickets = (tickets: Ticket[]) => {
    console.log('SimulationStore: Syncing tickets from component lifecycle')
    // Just update tickets without reset logic - this is for component sync
    state.value.currentTickets = tickets
  }

  const shouldResetOnTicketChange = (): boolean => {
    // Business rule: Reset simulation when user changes tickets and we have results/errors
    return state.value.phase === 'results' || state.value.phase === 'error'
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
      console.warn('Simulation already running')
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
            console.warn('Failed to parse NDJSON line:', parseError)
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
      ? Object.fromEntries(
          Object.entries(summary.winDistribution.winsByClass).map(([k, v]) => [
            Number(k),
            v,
          ])
        )
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
  }
})

export type SimulationStore = ReturnType<typeof useSimulationStore>
