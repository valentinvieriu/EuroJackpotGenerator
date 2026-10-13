<template>
  <div>
    <div
      v-if="error"
      role="alert"
      class="rounded-xl border border-error bg-error-dark/50 p-3 text-center text-error-light"
    >
      {{ error }}
    </div>

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
      @again="runAgain"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Ticket } from '~/schemas'
import BatchSimulationProgress from './BatchSimulationProgress.vue'
import BatchSimulationResults from './BatchSimulationResults.vue'
import { calculateTotalSimulationCost } from '~/utils/simulationMath'

interface Props {
  tickets: Ticket[]
}

const props = defineProps<Props>()

const simStore = useSimulationStore()

const phase = computed(() => simStore.state.phase)
const progress = computed(() => simStore.state.progress)
const results = computed(() =>
  phase.value === 'results' ? simStore.state.results : null
)
const error = computed(() => simStore.state.error || '')

// Stake for one draw across all tickets (every line of every ticket)
const costPerDraw = computed(() => calculateTotalSimulationCost(props.tickets))

// The same run once more. The report makes way for the new run, so the view
// goes back up to the machine that is playing it.
const runAgain = () => {
  if (!results.value) return
  void simStore.startSimulation({
    simulationCount: results.value.totalSimulations,
  })
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches
  document
    .getElementById('machine-title')
    ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
}
</script>
