<template>
  <div>
    <div
      v-if="error"
      class="text-center text-red-400 bg-red-900/50 border border-red-500 p-3 rounded-md mb-4"
    >
      {{ error }}
    </div>

    <BatchSimulationConfig
      v-if="tickets.length > 0 && viewState.phase === 'config'"
      :ticket-count="tickets.length"
      :cost-per-simulation="costPerSimulation"
      :disabled="viewState.isRunning"
      :can-cancel="viewState.canCancel"
      :show-cancel-button="viewState.isRunning"
      @start="handleStart"
      @cancel="handleCancel"
    />

    <BatchSimulationProgress
      v-if="viewState.phase === 'running'"
      :current-simulation="viewState.currentSimulation"
      :total-simulations="viewState.totalSimulations"
      :elapsed-time="viewState.elapsedTime"
      :estimated-time-remaining="viewState.estimatedTimeRemaining"
      :can-cancel="viewState.canCancel"
      :partial-results="viewState.partialResults"
      @cancel="handleCancel"
    />

    <BatchSimulationResults
      v-if="viewState.phase === 'results' && viewState.results"
      :results="viewState.results"
      :tickets="tickets"
      @reset="handleReset"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch, computed, type PropType } from 'vue'
import { useRuntimeConfig } from '#app'
import { formatDurationCompact } from '~/utils/time'
import type {
  Ticket,
  EurojackpotHistoricOdds,
  BatchSimulationRequest,
  BatchSimulationResult,
  IndividualSimulationResult,
  TicketHighlightingData,
} from '~/schemas'
import { buildTicketHighlightUpdate } from '~/utils/ticketHighlighting'
import BatchSimulationConfig from './BatchSimulationConfig.vue'
import BatchSimulationProgress from './BatchSimulationProgress.vue'
import BatchSimulationResults from './BatchSimulationResults.vue'
import { playWinSound } from '~/utils/audioUtils'
// useSimulationStore is auto-imported via @pinia/nuxt configuration

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
  (e: 'winning-data-updated', data: EurojackpotHistoricOdds): void
}>()

const error = ref('')
const simStore = useSimulationStore()
const viewState = computed(() => {
  const s = simStore.state
  const p = s.progress
  return {
    phase: s.phase as 'config' | 'running' | 'results',
    isRunning: simStore.isRunning,
    canCancel: s.canCancel,
    currentSimulation: p?.currentSimulation ?? 0,
    totalSimulations: p?.totalSimulations ?? s.config?.simulationCount ?? 0,
    startTime: s.startTime,
    elapsedTime: p?.elapsedTime ?? 0,
    estimatedTimeRemaining: p?.estimatedTimeRemaining ?? null,
    partialResults: p?.partialResults ?? null,
    results: s.results as BatchSimulationResult | null,
  }
})
const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBase

// Kept for potential UI formatting; not used after store refactor
const _formatEstimatedTime = formatDurationCompact

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
  individualResults.forEach((simResult: IndividualSimulationResult) => {
    if (!simResult.winningNumbers) return

    const simMain = simResult.winningNumbers.mainNumbers
    const simEuro = simResult.winningNumbers.euroNumbers

    props.tickets.forEach((ticket) => {
      const ticketStats = ticketWinFrequency.get(ticket.id)!

      // Use shared helper to calculate highlight data for this ticket
      const highlightUpdate = buildTicketHighlightUpdate(
        ticket,
        simMain,
        simEuro
      )

      const hasWin = Object.values(highlightUpdate.winClassCounts).some(
        (count) => count > 0
      )

      if (hasWin) {
        ticketStats.totalWins++

        // Track frequency of winning numbers for this ticket
        highlightUpdate.winningMainNumbers.forEach((num: number) => {
          ticketStats.mainNumbers.set(
            num,
            (ticketStats.mainNumbers.get(num) || 0) + 1
          )
        })
        highlightUpdate.winningEuroNumbers.forEach((num: number) => {
          ticketStats.euroNumbers.set(
            num,
            (ticketStats.euroNumbers.get(num) || 0) + 1
          )
        })

        // Accumulate win class counts
        Object.entries(highlightUpdate.winClassCounts).forEach(
          ([cls, count]: [string, number]) => {
            const classNum = Number(cls)
            if ((count as number) > 0) {
              ticketStats.totalWinClassCounts[classNum] =
                (ticketStats.totalWinClassCounts[classNum] || 0) +
                (count as number)
            }
          }
        )
      }
    })
  })

  // Apply highlighting based on aggregate data
  const updates = props.tickets.map((ticket) => {
    const stats = ticketWinFrequency.get(ticket.id)!

    // Highlight numbers that won frequently (appeared in >10% of winning simulations for this ticket)
    const minFrequencyThreshold = Math.max(1, Math.floor(stats.totalWins * 0.1))

    const winningMainNumbers = ticket.mainNumbers.filter(
      (n: number) => (stats.mainNumbers.get(n) || 0) >= minFrequencyThreshold
    )
    const winningEuroNumbers = ticket.euroNumbers.filter(
      (n: number) => (stats.euroNumbers.get(n) || 0) >= minFrequencyThreshold
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

  // Fetch winning data for prize tooltips
  try {
    const winningData = await $fetch<EurojackpotHistoricOdds>(
      `${apiBaseUrl}/fetchWinningData`
    )
    emit('winning-data-updated', winningData)
  } catch (winningDataError) {
    console.warn('Failed to fetch winning data for tooltips:', winningDataError)
  }
  // Set store config and start simulation in store
  simStore.setConfig({
    simulationCount: cfg.simulationCount,
    batchSize: cfg.batchSize ?? 100,
  })

  try {
    await simStore.startSimulation(props.tickets, props.costPerSimulation, {
      simulationCount: cfg.simulationCount,
      batchSize: cfg.batchSize ?? 100,
    })
  } catch (err: unknown) {
    console.error('Batch simulation error:', err)
    // Error will also be reflected in store; show human-friendly UI message
    const anyErr = err as Record<string, unknown>
    const msg =
      (anyErr?.data as Record<string, unknown> | undefined)?.message ||
      (anyErr?.message as string | undefined) ||
      'An error occurred during batch simulation.'
    error.value = String(msg)
  } finally {
    // Store manages running/cancel flags
  }
}

const handleCancel = (): void => {
  simStore.cancelSimulation()
}

const handleReset = (): void => {
  simStore.resetSimulation()
}

onUnmounted(() => {
  simStore.cancelSimulation()
})

// When results are ready in the store, apply highlights and play sound
watch(
  () => simStore.state.phase,
  async (phase) => {
    if (phase === 'results' && simStore.state.results) {
      await applyHighlightsFromResults(simStore.state.results)
      if (simStore.state.results.roiPercentage > 0) {
        const r = simStore.state.results
        playWinSound(r.totalWinnings, r.totalCost)
      }
    }
  }
)
</script>

<style scoped></style>
