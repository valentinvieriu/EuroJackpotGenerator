<template>
  <div class="casino-card-premium hover-lift rounded-lg p-6">
    <div class="mb-6">
      <h2 class="text-section-title mb-2 text-2xl">
        Mass Simulation Configuration
      </h2>
      <p class="text-sm text-content-muted">
        Run multiple simulated draws to analyse expected outcomes and
        profitability
      </p>
    </div>

    <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <label
          for="simulationCount"
          class="mb-2 block text-sm font-medium text-content-muted"
        >
          Number of Simulations:
        </label>
        <select
          id="simulationCount"
          v-model.number="config.simulationCount"
          class="form-select min-w-0"
          :disabled="disabled"
          :title="
            simulationOptions.find(
              (opt) => opt.value === config.simulationCount
            )?.label || ''
          "
        >
          <option
            v-for="option in simulationOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <div>
        <label
          for="batchSize"
          class="mb-2 block text-sm font-medium text-content-muted"
        >
          Batch Size:
        </label>
        <select
          id="batchSize"
          v-model.number="config.batchSize"
          class="form-select"
          :disabled="disabled"
        >
          <option :value="50">50 (Faster)</option>
          <option :value="100">100 (Balanced)</option>
          <option :value="200">200 (Memory Efficient)</option>
        </select>
      </div>
    </div>

    <!-- Key Performance Indicators -->
    <div v-if="ticketCount > 0" class="casino-card mb-6 rounded-lg p-5">
      <h3
        class="mb-4 flex items-center gap-2 text-lg font-semibold text-content-secondary"
      >
        <svg
          class="h-5 w-5 text-brand-gold"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Simulation Summary
      </h3>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div class="casino-card rounded-lg p-4 text-center">
          <div class="mb-2 flex items-center justify-center gap-2">
            <svg
              class="h-4 w-4 text-error"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
              />
            </svg>
            <span class="text-sm font-medium text-content-secondary"
              >Total Cost</span
            >
            <span
              class="inline-flex items-center rounded-full border border-error/30 bg-error-dark/50 px-2 py-1 text-xs font-medium text-error-light"
            >
              HIGH
            </span>
          </div>
          <div class="text-2xl font-bold text-error">
            €{{
              totalSimulationCost.toLocaleString('en-GB', {
                minimumFractionDigits: 2,
              })
            }}
          </div>
          <div class="mt-1 text-xs text-content-muted">
            {{ config.simulationCount.toLocaleString() }} × €{{
              costPerSimulation.toFixed(2)
            }}
          </div>
        </div>

        <div class="casino-card rounded-lg p-4 text-center">
          <div class="mb-2 flex items-center justify-center gap-2">
            <svg
              class="h-4 w-4 text-brand-gold-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-sm font-medium text-content-secondary"
              >Break-even Target</span
            >
            <span
              class="inline-flex items-center rounded-full border border-warning/30 bg-warning-dark/50 px-2 py-1 text-xs font-medium text-warning-light"
            >
              TARGET
            </span>
          </div>
          <div class="text-2xl font-bold text-brand-gold-400">
            {{ breakEvenPercentage.toFixed(1) }}%
          </div>
          <div class="mt-1 text-xs text-content-muted">
            Win rate needed to break even
          </div>
        </div>

        <div class="casino-card rounded-lg p-4 text-center">
          <div class="mb-2 flex items-center justify-center gap-2">
            <svg
              class="h-4 w-4 text-brand-gold"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
            <span class="text-sm font-medium text-content-secondary"
              >Expected Scenarios</span
            >
            <span
              class="inline-flex items-center rounded-full border border-border-primary/30 bg-brand-gold/20 px-2 py-1 text-xs font-medium text-brand-gold"
            >
              EST.
            </span>
          </div>
          <div class="text-2xl font-bold text-brand-gold">
            {{ Math.round(config.simulationCount * 0.15) }}
          </div>
          <div class="mt-1 text-xs text-content-muted">
            Estimated winning simulations (~15%)
          </div>
        </div>
      </div>
    </div>

    <div
      class="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end"
    >
      <!-- Export Options -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label class="inline-flex items-center">
          <input
            v-model="config.includeIndividualResults"
            type="checkbox"
            class="rounded border-casino-blue-light/50 bg-surface-primary text-brand-gold focus:ring-brand-gold-400 focus:ring-offset-surface-primary"
            :disabled="
              disabled || config.simulationCount > LARGE_SIMULATION_THRESHOLD
            "
          />
          <span class="ml-2 text-sm text-content-secondary">
            Export individual results
          </span>
        </label>
        <p class="text-xs text-content-muted sm:ml-2">
          {{
            config.simulationCount > LARGE_SIMULATION_THRESHOLD
              ? `(Disabled for >${LARGE_SIMULATION_THRESHOLD} simulations)`
              : '(For detailed JSON export)'
          }}
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button
          v-if="showCancelButton"
          :disabled="disabled && !canCancel"
          class="focus-danger rounded-md bg-interactive-danger px-5 py-2 font-semibold text-content-primary transition duration-150 hover:bg-interactive-danger-hover disabled:cursor-not-allowed disabled:opacity-50"
          @click="$emit('cancel')"
        >
          Cancel Simulation
        </button>

        <button
          :disabled="disabled || ticketCount === 0"
          class="btn-casino-gold focus-gold rounded-md px-5 py-2 font-cta disabled:cursor-not-allowed disabled:opacity-50"
          @click="handleStartSimulation"
        >
          <svg
            v-if="disabled"
            class="mr-3 -ml-1 inline h-4 w-4 animate-spin text-content-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {{ disabled ? 'Running Simulation...' : 'Start Mass Simulation' }}
        </button>
      </div>
    </div>

    <div
      v-if="config.simulationCount >= HIGH_SIMULATION_WARNING_THRESHOLD"
      class="mt-4 rounded-md border border-warning bg-warning-dark/50 p-3"
    >
      <div class="flex">
        <svg
          class="mr-2 h-5 w-5 flex-shrink-0 text-brand-gold-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        <div>
          <h4 class="font-medium text-brand-gold-400">
            Large Simulation Warning
          </h4>
          <p class="mt-1 text-sm text-warning-light">
            This simulation may take several minutes to complete and use
            significant computational resources. Consider starting with fewer
            simulations to test your setup.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  LARGE_SIMULATION_THRESHOLD,
  HIGH_SIMULATION_WARNING_THRESHOLD,
} from '~/utils/constants'
import { computed, reactive, watch } from 'vue'
import type { BatchSimulationRequest, Ticket } from '~/schemas'
import { calculateTheoreticalExpectedValue } from '~/utils/batchStatistics'
import { calculateBreakEvenPercentage } from '~/utils/simulationMath'
// useOddsStore is auto-imported via @pinia/nuxt configuration

const props = defineProps({
  ticketCount: { type: Number, default: 0 },
  costPerSimulation: { type: Number, default: 2.0 },
  disabled: { type: Boolean, default: false },
  canCancel: { type: Boolean, default: false },
  showCancelButton: { type: Boolean, default: false },
  tickets: { type: Array as () => Ticket[], default: () => [] },
})

const emit = defineEmits<{
  start: [config: BatchSimulationRequest]
  cancel: []
}>()

const config = reactive({
  simulationCount: 1000,
  batchSize: 100,
  includeIndividualResults: false,
})

const oddsStore = useOddsStore()

const simulationOptions = [
  { value: 100, label: '100 (Quick Test)' },
  { value: 250, label: '250 (Small Analysis)' },
  { value: 500, label: '500 (Medium Analysis)' },
  { value: 1000, label: '1,000 (Standard Analysis)' },
  { value: 2500, label: '2,500 (Detailed Analysis)' },
  { value: 5000, label: '5,000 (Comprehensive)' },
  { value: 10000, label: '10,000 (Maximum)' },
]

const totalSimulationCost = computed(
  () => config.simulationCount * props.costPerSimulation
)

const breakEvenPercentage = computed(() => {
  if (props.tickets.length === 0) return 0

  // Get the first ticket to determine system parameters
  const firstTicket = props.tickets[0]
  if (!firstTicket) return 0

  const systemMain = firstTicket.mainNumbers.length
  const systemEuro = firstTicket.euroNumbers.length

  // Calculate theoretical expected value for all tickets
  const expectedValueTotal = calculateTheoreticalExpectedValue(
    props.ticketCount,
    systemMain,
    systemEuro,
    oddsStore.currentOdds
  )

  // Use utility function for break-even calculation
  return calculateBreakEvenPercentage(props.tickets, expectedValueTotal)
})

const handleStartSimulation = () => {
  if (props.ticketCount === 0) return
  const request: Omit<BatchSimulationRequest, 'tickets'> = {
    simulationCount: config.simulationCount,
    batchSize: config.batchSize,
    includeIndividualResults: config.includeIndividualResults,
  }
  emit('start', request as BatchSimulationRequest)
}

watch(
  () => config.simulationCount,
  (newValue) => {
    if (newValue > LARGE_SIMULATION_THRESHOLD) {
      config.includeIndividualResults = false
    }
  }
)
</script>
