<template>
  <div>
    <div
      v-if="error"
      class="text-center text-red-400 bg-red-900/50 border border-red-500 p-3 rounded-md mb-4"
    >
      {{ error }}
    </div>

    <BatchSimulationConfig
      v-if="tickets.length > 0 && state.phase === 'config'"
      :ticket-count="tickets.length"
      :cost-per-simulation="costPerSimulation"
      :disabled="state.isRunning"
      :can-cancel="state.canCancel"
      :show-cancel-button="state.isRunning"
      @start="handleStart"
      @cancel="handleCancel"
    />

    <BatchSimulationProgress
      v-if="state.phase === 'running'"
      :current-simulation="state.currentSimulation"
      :total-simulations="state.totalSimulations"
      :elapsed-time="state.elapsedTime"
      :estimated-time-remaining="state.estimatedTimeRemaining"
      :can-cancel="state.canCancel"
      :partial-results="state.partialResults"
      @cancel="handleCancel"
    />

    <BatchSimulationResults
      v-if="state.phase === 'results' && state.results"
      :results="state.results"
      @reset="handleReset"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, type PropType } from 'vue'
import { useRuntimeConfig } from '#app'
import { formatDurationCompact } from '~/utils/time'
import type { Ticket } from '~/types/ticket'
import type {
  BatchSimulationRequest,
  BatchSimulationResult,
  TicketHighlightingData,
} from '~/types/batchSimulation'
import { calculateWinningLineCounts } from '~/utils/combinatorics'
import BatchSimulationConfig from './BatchSimulationConfig.vue'
import BatchSimulationProgress from './BatchSimulationProgress.vue'
import BatchSimulationResults from './BatchSimulationResults.vue'
import { playWinSound } from '~/utils/audioUtils'

const props = defineProps({
  tickets: { type: Array as PropType<Ticket[]>, required: true },
  costPerSimulation: { type: Number, required: true },
})

const emit = defineEmits<{
  (
    e: 'apply-highlights',
    updates: Array<{
      id: number
      winningMainNumbers: number[]
      winningEuroNumbers: number[]
      winClassCounts: Record<number, number>
      winClass?: number
    }>
  ): void
}>()

const error = ref('')
const state = ref({
  phase: 'config' as 'config' | 'running' | 'results',
  isRunning: false,
  canCancel: false,
  currentSimulation: 0,
  totalSimulations: 0,
  startTime: 0,
  elapsedTime: 0,
  estimatedTimeRemaining: null as string | null,
  partialResults: null as {
    simulationsCompleted: number
    totalWins: number
    winPercentage: number
    currentROI: number
    netProfit: number
    maxWin: number
    winsByClass: Record<number, number>
  } | null,
  results: null as BatchSimulationResult | null,
  abortController: null as AbortController | null,
})

const timer = ref<NodeJS.Timeout | null>(null)
const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBase

const formatEstimatedTime = formatDurationCompact

/**
 * Applies highlights to tickets based on aggregate Monte Carlo results.
 * Uses lightweight highlighting data that's always available.
 */
const applyHighlightsFromResults = async (
  results: BatchSimulationResult
): Promise<void> => {
  if (results.highlightingData) {
    // Use optimized highlighting data (always available, memory efficient)
    applyOptimizedHighlighting(
      results.highlightingData,
      results.totalSimulations
    )
  } else if (
    results.individualResults &&
    results.individualResults.length > 0
  ) {
    // Fallback: use individual results if available (legacy support)
    applyAggregateHighlighting(results)
  } else {
    // Last resort: no specific highlighting available
    applyWinDistributionHighlighting(results)
  }
}

/**
 * Applies highlights using optimized highlighting data (memory efficient).
 * This is the preferred method as it doesn't require storing full individual results.
 */
const applyOptimizedHighlighting = (
  highlightingData: TicketHighlightingData,
  totalSimulations: number
): void => {
  const updates = props.tickets.map((ticket) => {
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
    const isLargeSimulation = totalSimulations >= 1000

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
    const significantWinClasses = { ...stats.winClassCounts }

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

  emit('apply-highlights', updates)
}

/**
 * Analyzes all individual simulations to show aggregate winning patterns.
 * Legacy fallback when individual results are available but optimized data isn't.
 */
const applyAggregateHighlighting = (results: BatchSimulationResult): void => {
  const individualResults = results.individualResults!

  // Track number frequency across all winning draws for each ticket
  const ticketWinFrequency = new Map<
    number,
    {
      mainNumbers: Map<number, number>
      euroNumbers: Map<number, number>
      totalWinClassCounts: Record<number, number>
      totalWins: number
    }
  >()

  // Initialize tracking for each ticket
  props.tickets.forEach((ticket) => {
    ticketWinFrequency.set(ticket.id, {
      mainNumbers: new Map(),
      euroNumbers: new Map(),
      totalWinClassCounts: {},
      totalWins: 0,
    })
  })

  // Analyze all simulations
  individualResults.forEach((simResult) => {
    if (!simResult.winningNumbers) return

    const simMain = simResult.winningNumbers.mainNumbers
    const simEuro = simResult.winningNumbers.euroNumbers
    const mainSet = new Set(simMain)
    const euroSet = new Set(simEuro)

    props.tickets.forEach((ticket) => {
      const ticketStats = ticketWinFrequency.get(ticket.id)!

      // Count matches for this simulation
      const matchingMain = ticket.mainNumbers.filter((n) => mainSet.has(n))
      const matchingEuro = ticket.euroNumbers.filter((n) => euroSet.has(n))

      const k = matchingMain.length
      const h = matchingEuro.length
      const m = ticket.mainNumbers.length
      const e = ticket.euroNumbers.length

      const winClassCounts = calculateWinningLineCounts(m, e, k, h)
      const hasWin = Object.values(winClassCounts).some((count) => count > 0)

      if (hasWin) {
        ticketStats.totalWins++

        // Track frequency of winning numbers for this ticket
        matchingMain.forEach((num) => {
          ticketStats.mainNumbers.set(
            num,
            (ticketStats.mainNumbers.get(num) || 0) + 1
          )
        })
        matchingEuro.forEach((num) => {
          ticketStats.euroNumbers.set(
            num,
            (ticketStats.euroNumbers.get(num) || 0) + 1
          )
        })

        // Accumulate win class counts
        Object.entries(winClassCounts).forEach(([cls, count]) => {
          const classNum = Number(cls)
          if (count > 0) {
            ticketStats.totalWinClassCounts[classNum] =
              (ticketStats.totalWinClassCounts[classNum] || 0) + count
          }
        })
      }
    })
  })

  // Apply highlighting based on aggregate data
  const updates = props.tickets.map((ticket) => {
    const stats = ticketWinFrequency.get(ticket.id)!

    // Highlight numbers that won frequently (appeared in >10% of winning simulations for this ticket)
    const minFrequencyThreshold = Math.max(1, Math.floor(stats.totalWins * 0.1))

    const winningMainNumbers = ticket.mainNumbers.filter(
      (n) => (stats.mainNumbers.get(n) || 0) >= minFrequencyThreshold
    )
    const winningEuroNumbers = ticket.euroNumbers.filter(
      (n) => (stats.euroNumbers.get(n) || 0) >= minFrequencyThreshold
    )

    const winClass = Object.keys(stats.totalWinClassCounts)
      .map(Number)
      .sort((a, b) => a - b)[0] // Best win class achieved

    return {
      id: ticket.id,
      winningMainNumbers,
      winningEuroNumbers,
      winClassCounts: stats.totalWinClassCounts,
      winClass,
    }
  })

  emit('apply-highlights', updates)
}

/**
 * Fallback highlighting when individual results aren't available.
 * Uses win distribution data to show which tickets likely won.
 */
const applyWinDistributionHighlighting = (
  _results: BatchSimulationResult
): void => {
  // Without individual results, we can only show aggregate win data
  // Generate a representative draw and use win distribution to estimate performance
  const updates = props.tickets.map((ticket) => ({
    id: ticket.id,
    winningMainNumbers: [], // No specific numbers to highlight
    winningEuroNumbers: [], // No specific numbers to highlight
    winClassCounts: {}, // Could potentially estimate from results.winDistribution
    winClass: undefined,
  }))

  emit('apply-highlights', updates)
}

const handleStart = async (cfg: BatchSimulationRequest): Promise<void> => {
  if (!props.tickets.length) return
  error.value = ''
  state.value = {
    phase: 'running',
    isRunning: true,
    canCancel: true,
    currentSimulation: 0,
    totalSimulations: cfg.simulationCount,
    startTime: Date.now(),
    elapsedTime: 0,
    estimatedTimeRemaining: null,
    partialResults: {
      simulationsCompleted: 0,
      totalWins: 0,
      winPercentage: 0,
      currentROI: 0,
      netProfit: 0,
      maxWin: 0,
      winsByClass: {},
    },
    results: null,
    abortController: new AbortController(),
  }

  timer.value = setInterval(() => {
    state.value.elapsedTime = Date.now() - state.value.startTime
    if (state.value.currentSimulation > 0) {
      const avg = state.value.elapsedTime / state.value.currentSimulation
      const remaining =
        state.value.totalSimulations - state.value.currentSimulation
      state.value.estimatedTimeRemaining = formatEstimatedTime(remaining * avg)
    }
  }, 1000)

  try {
    const request: BatchSimulationRequest = { ...cfg, tickets: props.tickets }
    const resp = await fetch(`${apiBaseUrl}/batchSimulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson',
      },
      body: JSON.stringify(request),
      signal: state.value.abortController?.signal ?? undefined,
    })
    const contentType = resp.headers.get('content-type') || ''
    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(text || `HTTP ${resp.status}`)
    }
    if (contentType.includes('application/x-ndjson') && resp.body) {
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const consume = async (): Promise<void> => {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let idx: number
          while ((idx = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, idx).trim()
            buffer = buffer.slice(idx + 1)
            if (!line) continue
            let msg: unknown
            try {
              msg = JSON.parse(line)
            } catch {
              console.warn('Failed to parse NDJSON line', line)
              continue
            }
            const isObj = (v: unknown): v is Record<string, unknown> =>
              typeof v === 'object' && v !== null
            if (
              isObj(msg) &&
              msg.type === 'progress' &&
              isObj(msg.progress) &&
              isObj(msg.summary)
            ) {
              const current = Number(msg.progress?.currentSimulation) || 0
              state.value.currentSimulation = current
              state.value.partialResults = {
                simulationsCompleted: current,
                totalWins:
                  isObj(msg.summary.winDistribution) &&
                  typeof msg.summary.winDistribution.totalWins === 'number'
                    ? msg.summary.winDistribution.totalWins
                    : 0,
                winPercentage:
                  isObj(msg.summary.winDistribution) &&
                  typeof msg.summary.winDistribution.winPercentage === 'number'
                    ? msg.summary.winDistribution.winPercentage
                    : 0,
                currentROI:
                  typeof msg.summary.roiPercentage === 'number'
                    ? msg.summary.roiPercentage
                    : 0,
                netProfit:
                  typeof msg.summary.netProfit === 'number'
                    ? msg.summary.netProfit
                    : 0,
                maxWin:
                  typeof msg.summary.maxWin === 'number'
                    ? msg.summary.maxWin
                    : 0,
                winsByClass:
                  isObj(msg.summary.winDistribution) &&
                  typeof msg.summary.winDistribution.winsByClass === 'object' &&
                  msg.summary.winDistribution.winsByClass !== null
                    ? (msg.summary.winDistribution.winsByClass as Record<
                        number,
                        number
                      >)
                    : {},
              }
            } else if (
              isObj(msg) &&
              msg.type === 'result' &&
              isObj(msg.result)
            ) {
              state.value.results =
                msg.result as unknown as BatchSimulationResult
              state.value.phase = 'results'
              // Apply highlights based on the first individual result
              if (state.value.results) {
                await applyHighlightsFromResults(state.value.results)
              }
            } else if (
              isObj(msg) &&
              msg.type === 'error' &&
              typeof msg.error === 'string'
            ) {
              throw new Error(String(msg.error))
            }
          }
        }
      }
      await consume()
    } else {
      state.value.results = (await resp.json()) as BatchSimulationResult
      state.value.phase = 'results'
      // Apply highlights based on the first individual result
      if (state.value.results) {
        await applyHighlightsFromResults(state.value.results)
      }
    }
    if (state.value.results && state.value.results.roiPercentage > 0) {
      const r = state.value.results
      playWinSound(r.totalWinnings, r.totalCost)
    }
  } catch (err: unknown) {
    console.error('Batch simulation error:', err)
    if (err instanceof DOMException && err.name === 'AbortError') {
      error.value = 'Batch simulation was cancelled.'
    } else if (typeof err === 'object' && err !== null) {
      const anyErr = err as Record<string, unknown>
      const msg =
        (anyErr.data as Record<string, unknown> | undefined)?.message ||
        (anyErr.message as string | undefined) ||
        'An error occurred during batch simulation.'
      error.value = String(msg)
    } else {
      error.value = 'An error occurred during batch simulation.'
    }
    state.value.phase = 'config'
  } finally {
    state.value.isRunning = false
    state.value.canCancel = false
    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
    }
  }
}

const handleCancel = (): void => {
  if (state.value.abortController) state.value.abortController.abort()
  state.value.canCancel = false
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
}

const handleReset = (): void => {
  state.value = {
    phase: 'config',
    isRunning: false,
    canCancel: false,
    currentSimulation: 0,
    totalSimulations: 0,
    startTime: 0,
    elapsedTime: 0,
    estimatedTimeRemaining: null,
    partialResults: null,
    results: null,
    abortController: null,
  }
}

onUnmounted(() => {
  if (state.value.abortController) state.value.abortController.abort()
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
})
</script>

<style scoped></style>
