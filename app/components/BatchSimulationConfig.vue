<template>
  <div
    class="bg-casino-blue-dark rounded-lg shadow-xl p-6 border border-casino-blue-light/30"
  >
    <div class="mb-6">
      <h2 class="text-2xl font-semibold text-gray-200 mb-2">
        Mass Simulation Configuration
      </h2>
      <p class="text-gray-400 text-sm">
        Run multiple simulated draws to analyse expected outcomes and
        profitability
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div>
        <label
          for="simulationCount"
          class="mb-2 block text-gray-400 text-sm font-medium"
        >
          Number of Simulations:
        </label>
        <select
          id="simulationCount"
          v-model.number="config.simulationCount"
          class="w-full px-3 py-2 border border-casino-blue-light/50 bg-casino-blue rounded-md focus:outline-none focus:ring-2 focus:ring-casino-gold focus:border-casino-gold text-gray-200"
          :disabled="disabled"
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
          class="mb-2 block text-gray-400 text-sm font-medium"
        >
          Batch Size:
        </label>
        <select
          id="batchSize"
          v-model.number="config.batchSize"
          class="w-full px-3 py-2 border border-casino-blue-light/50 bg-casino-blue rounded-md focus:outline-none focus:ring-2 focus:ring-casino-gold focus:border-casino-gold text-gray-200"
          :disabled="disabled"
        >
          <option :value="50">50 (Faster)</option>
          <option :value="100">100 (Balanced)</option>
          <option :value="200">200 (Memory Efficient)</option>
        </select>
      </div>

      <div>
        <label class="mb-2 block text-gray-400 text-sm font-medium">
          Estimated Runtime:
        </label>
        <div class="flex items-center justify-start h-10">
          <span class="text-sm text-casino-gold-light font-medium">
            {{ estimatedRuntime }}
          </span>
        </div>
      </div>
    </div>

    <div
      v-if="ticketCount > 0"
      class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-casino-blue/50 rounded-lg border border-casino-blue-light/20"
    >
      <div class="text-center">
        <div class="text-sm text-gray-400">Total Cost</div>
        <div class="text-lg font-semibold text-red-400">
          €{{
            totalSimulationCost.toLocaleString('en-GB', {
              minimumFractionDigits: 2,
            })
          }}
        </div>
        <div class="text-xs text-gray-500">
          {{ config.simulationCount.toLocaleString() }} × €{{
            costPerSimulation.toFixed(2)
          }}
        </div>
      </div>

      <div class="text-center">
        <div class="text-sm text-gray-400">Break-even Target</div>
        <div class="text-lg font-semibold text-yellow-400">
          {{ breakEvenPercentage.toFixed(1) }}%
        </div>
        <div class="text-xs text-gray-500">Win rate needed to break even</div>
      </div>

      <div class="text-center">
        <div class="text-sm text-gray-400">Expected Scenarios</div>
        <div class="text-lg font-semibold text-casino-gold-light">
          {{ Math.round(config.simulationCount * 0.15) }}
        </div>
        <div class="text-xs text-gray-500">
          Estimated winning simulations (~15%)
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
            class="rounded border-casino-blue-light/50 bg-casino-blue text-casino-gold focus:ring-casino-gold focus:ring-offset-casino-blue-dark"
            :disabled="disabled || config.simulationCount > 1000"
          />
          <span class="ml-2 text-sm text-gray-300">
            Export individual results
          </span>
        </label>
        <p class="text-xs text-gray-500 sm:ml-2">
          {{
            config.simulationCount > 1000
              ? '(Disabled for >1000 simulations)'
              : '(For detailed JSON export)'
          }}
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button
          v-if="showCancelButton"
          :disabled="disabled && !canCancel"
          class="bg-red-600 text-white px-5 py-2 rounded-md font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-casino-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
          @click="$emit('cancel')"
        >
          Cancel Simulation
        </button>

        <button
          :disabled="disabled || ticketCount === 0"
          class="bg-gradient-to-r from-vip-orange to-vip-orange-light text-white px-5 py-2 rounded-md font-semibold hover:from-vip-orange-light hover:to-[#FF7A4D] focus:outline-none focus:ring-2 focus:ring-vip-orange focus:ring-offset-2 focus:ring-offset-casino-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
          @click="handleStartSimulation"
        >
          <svg
            v-if="disabled"
            class="animate-spin -ml-1 mr-3 h-4 w-4 text-white inline"
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
      v-if="config.simulationCount >= 5000"
      class="mt-4 p-3 bg-yellow-900/50 border border-yellow-500 rounded-md"
    >
      <div class="flex">
        <svg
          class="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0"
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
          <h4 class="text-yellow-400 font-medium">Large Simulation Warning</h4>
          <p class="text-yellow-300 text-sm mt-1">
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
import { computed } from 'vue'
import type { BatchSimulationRequest } from '~/types/batchSimulation'

const props = defineProps({
  ticketCount: { type: Number, default: 0 },
  costPerSimulation: { type: Number, default: 2.0 },
  disabled: { type: Boolean, default: false },
  canCancel: { type: Boolean, default: false },
  showCancelButton: { type: Boolean, default: false },
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
  if (props.costPerSimulation <= 0) return 0
  const averageWinAmount = 12.5
  return (props.costPerSimulation / averageWinAmount) * 100
})

const estimatedRuntime = computed(() => {
  const baseTimePerThousand = 2
  const totalSeconds = (config.simulationCount / 1000) * baseTimePerThousand
  if (totalSeconds < 60) return `~${Math.ceil(totalSeconds)}s`
  if (totalSeconds < 3600) return `~${Math.ceil(totalSeconds / 60)}m`
  return `~${Math.ceil(totalSeconds / 3600)}h`
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
    if (newValue > 1000) {
      config.includeIndividualResults = false
    }
  }
)
</script>
