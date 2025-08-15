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
      :tickets="tickets"
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
import { onUnmounted, watch, computed, type PropType } from 'vue'
import type {
  Ticket,
  EurojackpotHistoricOdds,
  BatchSimulationRequest,
  BatchSimulationResult,
} from '~/schemas'
import BatchSimulationConfig from './BatchSimulationConfig.vue'
import BatchSimulationProgress from './BatchSimulationProgress.vue'
import BatchSimulationResults from './BatchSimulationResults.vue'
import { playWinSound } from '~/utils/audioUtils'
import { logger } from '~/utils/logger'
import { combinationCount } from '~/utils/combinatorics'
import { PRICE_PER_LINE } from '~/utils/pricing'
// useSimulationStore is auto-imported via @pinia/nuxt configuration

const props = defineProps({
  tickets: { type: Array as PropType<Ticket[]>, required: true },
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

// Use centralized error handling
const { addError: addTransientError } = useTransientErrors()
const error = computed(() => simStore.state.error || '')
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
    estimatedTimeRemaining: p?.estimatedTimeRemaining ?? undefined,
    partialResults: p?.partialResults ?? undefined,
    results: s.results as BatchSimulationResult | null,
  }
})

// Cost per simulation across all provided tickets (all lines)
const costPerSimulation = computed(() =>
  props.tickets.reduce((sum, t) => {
    const m = t.mainNumbers.length
    const e = t.euroNumbers.length
    return sum + combinationCount(m, e) * PRICE_PER_LINE
  }, 0)
)

/**
 * Apply highlights from completed batch simulation results.
 * Uses centralized store highlighting instead of local computation.
 */
const applyHighlightsFromResults = async (
  _results: BatchSimulationResult
): Promise<void> => {
  // Since highlighting is now centralized in the simulation store,
  // we just emit the store-computed highlights for Monte Carlo mode to the parent
  const highlights = simStore.getCurrentMonteCarloHighlights()
  emit('apply-highlights', highlights)
}

const handleStart = async (cfg: BatchSimulationRequest): Promise<void> => {
  if (!props.tickets.length) return
  simStore.clearError()

  // Fetch winning data for prize tooltips using centralized odds store
  try {
    const oddsStore = useOddsStore()
    const winningData = await oddsStore.fetchOdds()
    emit('winning-data-updated', winningData)
  } catch (winningDataError) {
    logger.warn('Failed to fetch winning data for tooltips:', winningDataError)
  }

  // Set store config and start simulation in store
  simStore.setConfig({
    simulationCount: cfg.simulationCount,
    batchSize: cfg.batchSize ?? 100,
  })

  try {
    const ticketsStore = useTicketsStore()
    await simStore.startSimulation(ticketsStore.totalPrice, {
      simulationCount: cfg.simulationCount,
      batchSize: cfg.batchSize ?? 100,
    })
  } catch (err: unknown) {
    logger.error('Batch simulation error:', err)
    // Error will also be reflected in store; show human-friendly transient error
    const anyErr = err as Record<string, unknown>
    const msg =
      (anyErr?.data as Record<string, unknown> | undefined)?.message ||
      (anyErr?.message as string | undefined) ||
      'An error occurred during batch simulation.'
    addTransientError(String(msg), 5000)
  } finally {
    // Store manages running/cancel flags
  }
}

const handleCancel = (): void => {
  simStore.cancelSimulation()
}

const handleReset = (): void => {
  // Preserve tickets and config; just return to config phase
  simStore.resetToConfig()
}

onUnmounted(() => {
  simStore.cancelSimulation()
})

// When results are ready in the store, apply highlights and play sound
watch(
  () => simStore.state.phase,
  async (phase) => {
    if (phase === 'results' && simStore.state.results) {
      const results = simStore.state.results as BatchSimulationResult
      await applyHighlightsFromResults(results)
      // Double-check results still exist after async operation
      if (simStore.state.results && simStore.state.results.roiPercentage > 0) {
        const r = simStore.state.results
        playWinSound(r.totalWinnings, r.totalCost)
      }
    }
  }
)
</script>

<style scoped></style>
