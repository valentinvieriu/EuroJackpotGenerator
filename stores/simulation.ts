/**
 * Simulation Store - single draws and Monte Carlo (autoplay) runs
 *
 * Owns the draw and the run lifecycle. Tickets are owned by the tickets store
 * and read from there, and everything about "how did these tickets do" is
 * derived from the tickets, the draw and the prizes rather than stored.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  BatchSimulationResult,
  Ticket,
  EurojackpotHistoricOdds,
} from '~/schemas'
import { batchSimulationRequestSchema } from '~/schemas/batchSimulation'
import {
  startSimulationRun,
  type SimulationRun,
} from '~/utils/simulationRunner'
import type {
  SimulationSnapshot,
  TrajectoryPoint,
} from '~/utils/simulationEngine'
import { randomSeed } from '~/utils/sfc32'
import { LONG_RUN_PRIZES } from '~/utils/prizeTable'
import {
  scoreDraw,
  type DrawScore,
  type TicketHighlight,
  type WinningNumbers,
} from '~/utils/drawScoring'
import { useOddsStore } from './odds'
import { useTicketsStore } from './tickets'
import {
  LARGE_SIMULATION_THRESHOLD,
  SIGNIFICANT_WIN_FRACTION_LARGE,
  SIGNIFICANT_WIN_ABS_MIN,
} from '~/utils/constants'
import { logger } from '~/utils/logger'
import { extractErrorMessage } from '~/utils/errors'

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
  /** Replays an earlier run exactly. A fresh seed is drawn when left out. */
  seed?: string
}

export type SingleDrawPhase = 'idle' | 'running' | 'results' | 'error'

/** How the tickets on the table did in the current single draw */
export type SingleDrawResults = DrawScore

/** The draw itself. What it means for the tickets is derived, not stored. */
export interface SingleDrawState {
  phase: SingleDrawPhase
  winningNumbers: WinningNumbers | null
  oddsData: EurojackpotHistoricOdds | null
  error: string | null
}

/** Running tally of every draw played this session, by hand or on autoplay */
export interface SessionLedger {
  draws: number
  spent: number
  won: number
}

export type { TrajectoryPoint }

export interface SimulationState {
  phase: SimulationPhase
  config: SimulationConfig | null
  progress: SimulationProgress | null
  results: BatchSimulationResult | null
  error: string | null
  startTime: number
  canCancel: boolean
  singleDraw: SingleDrawState
}

export const useSimulationStore = defineStore('simulation', () => {
  const createIdleSingleDraw = (): SingleDrawState => ({
    phase: 'idle',
    winningNumbers: null,
    oddsData: null,
    error: null,
  })

  const createEmptyLedger = (): SessionLedger => ({
    draws: 0,
    spent: 0,
    won: 0,
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
    singleDraw: createIdleSingleDraw(),
  })

  // What the machine has taken and paid out this session: every spin by hand
  // and every autoplay run that finished or was stopped
  const session = ref<SessionLedger>(createEmptyLedger())

  // The autoplay run in flight, not yet settled into the session
  const runTally = ref<SessionLedger>(createEmptyLedger())

  /** What the cabinet's meters read: the session plus the run still playing */
  const meter = computed<SessionLedger>(() => ({
    draws: session.value.draws + runTally.value.draws,
    spent: session.value.spent + runTally.value.spent,
    won: session.value.won + runTally.value.won,
  }))

  /** The run is over: its draws were paid for, so they join the session */
  const settleRun = (played: SessionLedger = runTally.value) => {
    session.value = {
      draws: session.value.draws + played.draws,
      spent: session.value.spent + played.spent,
      won: session.value.won + played.won,
    }
    runTally.value = createEmptyLedger()
  }

  // Cumulative paid in / won back over the current autoplay run
  const trajectory = ref<TrajectoryPoint[]>([])
  const TRAJECTORY_ORIGIN: TrajectoryPoint = { draws: 0, spent: 0, won: 0 }

  // The worker run in flight. A handle rather than data, so it stays out of
  // the reactive state. The id tells a run that was cancelled or replaced
  // while it was still starting that its outcome is no longer wanted.
  let activeRun: SimulationRun | null = null
  let currentRunId = 0

  // Tickets have one owner. Resolved on use, never during setup: the tickets
  // store sets this store up, so reaching back at that point would loop.
  const tickets = computed<Ticket[]>(() => useTicketsStore().state.tickets)

  // Computed getters
  const isRunning = computed(() => state.value.phase === 'running')
  const hasResults = computed(
    () => state.value.phase === 'results' && !!state.value.results
  )
  const hasError = computed(
    () => state.value.phase === 'error' && !!state.value.error
  )

  const isSingleDrawRunning = computed(
    () => state.value.singleDraw.phase === 'running'
  )
  const hasSingleDrawError = computed(
    () =>
      state.value.singleDraw.phase === 'error' && !!state.value.singleDraw.error
  )

  /**
   * The current draw scored against the tickets on the table. Because it is
   * derived, swapping or deleting tickets re-scores the same draw by itself.
   */
  const singleDrawResults = computed<SingleDrawResults | null>(() => {
    const { phase, winningNumbers, oddsData } = state.value.singleDraw
    if (phase !== 'results' || !winningNumbers || tickets.value.length === 0) {
      return null
    }
    return scoreDraw(tickets.value, winningNumbers, oddsData)
  })

  const hasSingleDrawResults = computed(() => !!singleDrawResults.value)

  // Actions

  const setConfig = (config: SimulationConfig) => {
    state.value.config = config
    state.value.phase = 'config'
    clearError()
  }

  const clearError = () => {
    state.value.error = null
    if (state.value.phase === 'error') {
      state.value.phase = 'config'
    }
  }

  // --- Notifications from the tickets store ---

  /** A new set of tickets replaced the old one: a finished run no longer describes them */
  const ticketsGenerated = () => {
    if (state.value.phase === 'results' || state.value.phase === 'error') {
      resetToConfig()
    }
  }

  /** One ticket was removed: a finished run no longer describes the tickets */
  const ticketRemoved = () => {
    if (state.value.phase === 'results') {
      resetToConfig()
    }
  }

  /** The user started over: nothing of the old session applies any more */
  const ticketsReset = () => {
    cashOut()
  }

  // --- Session ---

  /** Walk away from the machine: the meters, the draw and the run are cleared, the tickets stay */
  const cashOut = () => {
    resetToConfig()
    resetSingleDraw()
    session.value = createEmptyLedger()
  }

  // --- Single draw ---

  const runSingleDraw = async (): Promise<void> => {
    if (state.value.singleDraw.phase === 'running') {
      logger.warn('Single draw already running')
      return
    }

    if (tickets.value.length === 0) {
      logger.warn('No tickets available for single draw')
      return
    }

    state.value.singleDraw = { ...createIdleSingleDraw(), phase: 'running' }

    try {
      const apiBaseUrl = useRuntimeConfig().public.apiBase

      const [simResponse, oddsData] = await Promise.all([
        $fetch<{
          draw: WinningNumbers
          meta: Record<string, unknown>
        }>(`${apiBaseUrl}/simulate`),
        useOddsStore().fetchOdds(),
      ])

      if (!simResponse.draw?.mainNumbers || !simResponse.draw?.euroNumbers) {
        throw new Error('Invalid simulation result received from API.')
      }

      const winningNumbers: WinningNumbers = {
        mainNumbers: simResponse.draw.mainNumbers,
        euroNumbers: simResponse.draw.euroNumbers,
      }

      state.value.singleDraw = {
        phase: 'results',
        winningNumbers,
        oddsData,
        error: null,
      }

      // The stake is paid on the tickets as they were when the draw ran
      const score = scoreDraw(tickets.value, winningNumbers, oddsData)
      session.value = {
        draws: session.value.draws + 1,
        spent: session.value.spent + score.stake,
        won: session.value.won + score.totalWinnings,
      }
    } catch (error: unknown) {
      logger.error('Single draw error:', error)
      state.value.singleDraw = {
        ...createIdleSingleDraw(),
        phase: 'error',
        error: extractErrorMessage(error),
      }
    }
  }

  const resetSingleDraw = () => {
    state.value.singleDraw = createIdleSingleDraw()
  }

  // --- Monte Carlo (autoplay) ---

  /** Clear the run and its report, keeping the chosen config */
  const resetToConfig = () => {
    if (state.value.phase === 'running') {
      cancelSimulation()
    }

    state.value = {
      ...state.value,
      phase: 'config',
      progress: null,
      results: null,
      error: null,
      startTime: 0,
      canCancel: false,
    }
    trajectory.value = []
  }

  const startSimulation = async (config: SimulationConfig): Promise<void> => {
    if (state.value.phase === 'running') {
      logger.warn('Simulation already running')
      return
    }

    const runTickets = tickets.value
    if (runTickets.length === 0) {
      state.value.phase = 'error'
      state.value.error = 'No tickets available for simulation.'
      return
    }

    // A run replaces the draw on the table: one draw's matches say nothing about it
    resetSingleDraw()

    const runId = ++currentRunId
    state.value = {
      ...state.value,
      phase: 'running',
      config,
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
    }
    trajectory.value = [TRAJECTORY_ORIGIN]

    try {
      // Parsing also leaves plain data: reactive proxies cannot be handed to a worker
      const request = batchSimulationRequestSchema.parse({
        tickets: runTickets.map((t) => ({
          id: t.id,
          mainNumbers: [...t.mainNumbers],
          euroNumbers: [...t.euroNumbers],
          linesCount: t.linesCount,
        })),
        simulationCount: config.simulationCount,
        seed: config.seed ?? randomSeed(),
        // Every hit is paid its class's long-run average prize. The last
        // draw's prizes are right for one draw, but paid on every hit of a
        // long run they can return more than was staked.
        payouts: LONG_RUN_PRIZES,
        recordDraws: config.simulationCount <= LARGE_SIMULATION_THRESHOLD,
      })

      const run = startSimulationRun(request, (snapshot) => {
        if (runId === currentRunId) updateProgress(snapshot)
      })
      activeRun = run

      const outcome = await run.finished
      if (!outcome || runId !== currentRunId) return

      trajectory.value = [TRAJECTORY_ORIGIN, ...outcome.trajectory]
      state.value.results = outcome.result
      state.value.progress = null
      state.value.phase = 'results'
      // The final totals are authoritative, not the last progress update
      settleRun({
        draws: outcome.result.totalSimulations,
        spent: outcome.result.totalCost,
        won: outcome.result.totalWinnings,
      })
    } catch (error: unknown) {
      if (runId !== currentRunId) return
      state.value.phase = 'error'
      state.value.error = extractErrorMessage(error)
      settleRun()
    } finally {
      if (runId === currentRunId) {
        state.value.canCancel = false
        activeRun = null
      }
    }
  }

  const cancelSimulation = () => {
    if (state.value.phase !== 'running' || !state.value.canCancel) return

    currentRunId++
    activeRun?.cancel()
    activeRun = null
    state.value.phase = 'cancelled'
    state.value.canCancel = false
    // The draws played before the stop still count
    settleRun()
  }

  const updateProgress = (snapshot: SimulationSnapshot) => {
    if (!state.value.progress) return

    const { draws, totalDraws, totalCost, totalWinnings, hits } = snapshot
    const elapsed = Date.now() - state.value.startTime
    const progressPercentage = totalDraws > 0 ? (draws / totalDraws) * 100 : 0
    const netProfit = totalWinnings - totalCost

    trajectory.value = [TRAJECTORY_ORIGIN, ...snapshot.trajectory]
    runTally.value = { draws, spent: totalCost, won: totalWinnings }

    state.value.progress = {
      currentSimulation: draws,
      totalSimulations: totalDraws,
      progressPercentage,
      elapsedTime: elapsed,
      estimatedTimeRemaining: calculateETA(progressPercentage, elapsed),
      partialResults: {
        simulationsCompleted: draws,
        totalWins: hits,
        winPercentage: draws > 0 ? (hits / draws) * 100 : 0,
        currentROI: totalCost > 0 ? (netProfit / totalCost) * 100 : 0,
        netProfit,
        maxWin: snapshot.maxWin,
        winsByClass: snapshot.winsByClass,
      },
    }
  }

  // --- Highlights ---

  /**
   * Per-ticket highlights for a finished Monte Carlo run: the numbers that
   * took part in wins, and every win class the ticket landed.
   */
  const monteCarloHighlights = computed<TicketHighlight[]>(() => {
    const results = state.value.results
    if (!hasResults.value || !results?.highlightingData) return []

    const { ticketStats } = results.highlightingData
    // Long runs touch almost every number at least once, so only the standouts count
    const isLargeRun = results.totalSimulations >= LARGE_SIMULATION_THRESHOLD

    return tickets.value.map((ticket) => {
      const stats = ticketStats[ticket.id]
      if (!stats) {
        return {
          id: ticket.id,
          winningMainNumbers: [],
          winningEuroNumbers: [],
          winClassCounts: {},
        }
      }

      const minWins = isLargeRun
        ? Math.max(
            SIGNIFICANT_WIN_ABS_MIN,
            Math.floor(stats.totalWins * SIGNIFICANT_WIN_FRACTION_LARGE)
          )
        : 1

      const winClassCounts = normalizeWinsByClass(stats.winClassCounts)
      const classes = Object.keys(winClassCounts).map(Number)

      return {
        id: ticket.id,
        winningMainNumbers: ticket.mainNumbers.filter(
          (n) => (stats.mainNumberFrequency[n] || 0) >= minWins
        ),
        winningEuroNumbers: ticket.euroNumbers.filter(
          (n) => (stats.euroNumberFrequency[n] || 0) >= minWins
        ),
        winClassCounts,
        winClass: classes.length > 0 ? Math.min(...classes) : undefined,
      }
    })
  })

  const getHighlightsForMode = (
    mode: 'single' | 'montecarlo'
  ): TicketHighlight[] =>
    mode === 'single'
      ? (singleDrawResults.value?.ticketHighlights ?? [])
      : monteCarloHighlights.value

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

  return {
    // State
    state,
    session,
    trajectory,

    // Computed
    meter,
    isRunning,
    hasResults,
    hasError,
    isSingleDrawRunning,
    hasSingleDrawResults,
    hasSingleDrawError,
    singleDrawResults,

    // Highlights
    getHighlightsForMode,

    // Notifications from the tickets store
    ticketsGenerated,
    ticketRemoved,
    ticketsReset,

    // Session
    cashOut,

    // Monte Carlo actions
    setConfig,
    startSimulation,
    cancelSimulation,
    resetToConfig,
    clearError,

    // Single draw actions
    runSingleDraw,
    resetSingleDraw,
  }
})

export type SimulationStore = ReturnType<typeof useSimulationStore>
