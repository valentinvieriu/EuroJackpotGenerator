<template>
  <div>
    <div
      v-if="error"
      role="alert"
      class="mb-4 rounded-xl border border-error bg-error-dark/50 p-3 text-center text-error-light"
    >
      {{ error }}
    </div>

    <BatchSimulationConfig
      v-if="phase !== 'running' && !results"
      :cost-per-draw="costPerDraw"
      :disabled="tickets.length === 0"
      @start="handleStart"
    />

    <BatchSimulationProgress
      v-else-if="phase === 'running'"
      :current-simulation="progress?.currentSimulation ?? 0"
      :total-simulations="
        progress?.totalSimulations ??
        simStore.state.config?.simulationCount ??
        0
      "
      :elapsed-time="progress?.elapsedTime ?? 0"
      :estimated-time-remaining="progress?.estimatedTimeRemaining ?? null"
      :can-cancel="simStore.state.canCancel"
      :partial-results="progress?.partialResults ?? null"
      :trajectory="simStore.trajectory"
      :cost-per-draw="costPerDraw"
      @cancel="simStore.cancelSimulation()"
    />

    <BatchSimulationResults
      v-else-if="results"
      :results="results"
      :tickets="tickets"
      :trajectory="simStore.trajectory"
      @reset="simStore.resetToConfig()"
    />
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, watch, computed } from 'vue'
import type { Ticket } from '~/schemas'
import BatchSimulationConfig from './BatchSimulationConfig.vue'
import BatchSimulationProgress from './BatchSimulationProgress.vue'
import BatchSimulationResults from './BatchSimulationResults.vue'
import { logger } from '~/utils/logger'
import { calculateTotalSimulationCost } from '~/utils/simulationMath'
import { useMachineSounds } from '~/composables/useMachineSounds'

interface Props {
  tickets: Ticket[]
}

const props = defineProps<Props>()

const simStore = useSimulationStore()
const sounds = useMachineSounds()

const phase = computed(() => simStore.state.phase)
const progress = computed(() => simStore.state.progress)
const results = computed(() =>
  phase.value === 'results' ? simStore.state.results : null
)
const error = computed(() => simStore.state.error || '')

// Stake for one draw across all tickets (every line of every ticket)
const costPerDraw = computed(() => calculateTotalSimulationCost(props.tickets))

const handleStart = async (config: {
  simulationCount: number
}): Promise<void> => {
  if (!props.tickets.length) return
  simStore.clearError()

  // Warm the prize table so the paytable and ticket prizes are ready
  try {
    await useOddsStore().fetchOdds()
  } catch (oddsError) {
    logger.warn('Failed to fetch prize data before autoplay:', oddsError)
  }

  simStore.setConfig(config)
  await simStore.startSimulation(config)
}

onUnmounted(() => {
  simStore.cancelSimulation()
})

// The run gets the same verdict as a single spin: bells that climb with what
// came back, which for most runs means a short run that never resolves
watch(phase, (current) => {
  const finished = simStore.state.results
  if (current === 'results' && finished) {
    sounds.result(finished.totalWinnings, finished.totalCost)
  }
})
</script>
