<template>
  <div class="casino-card-premium rounded-lg p-6 hover-lift">
    <div class="mb-6">
      <h2 class="text-2xl text-section-title mb-2">
        Mass Simulation Configuration
      </h2>
      <p class="text-content-muted text-sm">
        Run multiple simulated draws to analyse expected outcomes and
        profitability
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div>
        <label
          for="simulationCount"
          class="mb-2 block text-content-muted text-sm font-medium"
        >
          Number of Simulations:
        </label>
        <select
          id="simulationCount"
          v-model.number="config.simulationCount"
          class="w-full min-w-0 px-3 py-2 border border-casino-blue-light/50 bg-surface-primary rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold-400 focus:border-border-primary text-content-secondary"
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
          class="mb-2 block text-content-muted text-sm font-medium"
        >
          Batch Size:
        </label>
        <select
          id="batchSize"
          v-model.number="config.batchSize"
          class="w-full px-3 py-2 border border-casino-blue-light/50 bg-surface-primary rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold-400 focus:border-border-primary text-content-secondary"
          :disabled="disabled"
        >
          <option :value="50">50 (Faster)</option>
          <option :value="100">100 (Balanced)</option>
          <option :value="200">200 (Memory Efficient)</option>
        </select>
      </div>
    </div>

    <!-- Key Performance Indicators -->
    <div v-if="ticketCount > 0" class="mb-6 p-5 casino-card rounded-lg">
      <h3
        class="text-lg font-semibold text-content-secondary mb-4 flex items-center gap-2"
      >
        <svg
          class="w-5 h-5 text-brand-gold"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Simulation Summary
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="text-center casino-card p-4 rounded-lg">
          <div class="flex items-center justify-center gap-2 mb-2">
            <svg
              class="w-4 h-4 text-error"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
              />
            </svg>
            <span class="text-sm text-content-secondary font-medium"
              >Total Cost</span
            >
            <span
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error-dark/50 text-error-light border border-error/30"
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
          <div class="text-xs text-content-muted mt-1">
            {{ config.simulationCount.toLocaleString() }} × €{{
              costPerSimulation.toFixed(2)
            }}
          </div>
        </div>

        <div class="text-center casino-card p-4 rounded-lg">
          <div class="flex items-center justify-center gap-2 mb-2">
            <svg
              class="w-4 h-4 text-brand-gold-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-sm text-content-secondary font-medium"
              >Break-even Target</span
            >
            <span
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-dark/50 text-warning-light border border-warning/30"
            >
              TARGET
            </span>
          </div>
          <div class="text-2xl font-bold text-brand-gold-400">
            {{ breakEvenPercentage.toFixed(1) }}%
          </div>
          <div class="text-xs text-content-muted mt-1">
            Win rate needed to break even
          </div>
        </div>

        <div class="text-center casino-card p-4 rounded-lg">
          <div class="flex items-center justify-center gap-2 mb-2">
            <svg
              class="w-4 h-4 text-brand-gold"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
            <span class="text-sm text-content-secondary font-medium"
              >Expected Scenarios</span
            >
            <span
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand-gold/20 text-brand-gold border border-border-primary/30"
            >
              EST.
            </span>
          </div>
          <div class="text-2xl font-bold text-brand-gold">
            {{ Math.round(config.simulationCount * 0.15) }}
          </div>
          <div class="text-xs text-content-muted mt-1">
            Estimated winning simulations (~15%)
          </div>
        </div>
      </div>
    </div>

    <div
      class="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4"
    >
      <!-- Export Options -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-2">
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
          class="bg-interactive-danger text-content-primary px-5 py-2 rounded-md font-semibold hover:bg-interactive-danger-hover focus:outline-none focus:ring-2 focus:ring-interactive-danger focus:ring-offset-2 focus:ring-offset-surface-primary disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
          @click="$emit('cancel')"
        >
          Cancel Simulation
        </button>

        <button
          :disabled="disabled || ticketCount === 0"
          class="btn-casino-gold px-5 py-2 rounded-md font-cta focus-gold disabled:opacity-50 disabled:cursor-not-allowed"
          @click="handleStartSimulation"
        >
          <svg
            v-if="disabled"
            class="animate-spin -ml-1 mr-3 h-4 w-4 text-content-primary inline"
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
      class="mt-4 p-3 bg-warning-dark/50 border border-warning rounded-md"
    >
      <div class="flex">
        <svg
          class="h-5 w-5 text-brand-gold-400 mr-2 flex-shrink-0"
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
          <h4 class="text-brand-gold-400 font-medium">
            Large Simulation Warning
          </h4>
          <p class="text-warning-light text-sm mt-1">
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
