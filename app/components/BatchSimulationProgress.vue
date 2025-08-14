<template>
  <div
    class="bg-casino-blue-dark rounded-lg shadow-xl p-6 border border-casino-blue-light/30"
  >
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xl font-semibold text-gray-200">
          Mass Simulation in Progress
        </h3>
        <div class="text-sm text-gray-400">
          {{ formatElapsedTime(elapsedTime) }}
        </div>
      </div>

      <div class="w-full bg-casino-blue rounded-full h-3 mb-3">
        <div
          class="bg-gradient-to-r from-vip-orange to-vip-orange-light h-3 rounded-full transition-all duration-300 ease-out"
          :style="{ width: `${progressPercentage}%` }"
        />
      </div>

      <div class="flex justify-between items-center text-sm">
        <span class="text-gray-300">
          {{ currentSimulation.toLocaleString() }} /
          {{ totalSimulations.toLocaleString() }} simulations
        </span>
        <span class="text-casino-gold font-medium">
          {{ progressPercentage.toFixed(1) }}%
        </span>
      </div>
    </div>

    <div
      v-if="partialResults"
      class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-casino-blue/50 rounded-lg border border-casino-blue-light/20"
    >
      <div class="text-center">
        <div class="text-sm text-gray-400">Current Win Rate</div>
        <div class="text-lg font-semibold" :class="winRateColor">
          {{ partialResults.winPercentage.toFixed(1) }}%
        </div>
        <div class="text-xs text-gray-500">
          {{ partialResults.totalWins }} /
          {{ partialResults.simulationsCompleted }} wins
        </div>
      </div>

      <div class="text-center">
        <div class="text-sm text-gray-400">Current ROI</div>
        <div class="text-lg font-semibold" :class="roiColor">
          {{ partialResults.currentROI >= 0 ? '+' : ''
          }}{{ partialResults.currentROI.toFixed(1) }}%
        </div>
        <div class="text-xs text-gray-500">
          €{{
            partialResults.netProfit.toLocaleString('en-GB', {
              minimumFractionDigits: 2,
            })
          }}
          profit/loss
        </div>
      </div>

      <div class="text-center">
        <div class="text-sm text-gray-400">Biggest Win</div>
        <div class="text-lg font-semibold text-casino-gold">
          €{{
            partialResults.maxWin.toLocaleString('en-GB', {
              minimumFractionDigits: 2,
            })
          }}
        </div>
        <div class="text-xs text-gray-500">Best single simulation</div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div class="text-center p-3 bg-casino-blue/30 rounded-lg">
        <div class="text-sm text-gray-400 mb-1">Estimated Time Remaining</div>
        <div class="text-lg font-medium text-gray-200">
          {{ estimatedTimeRemaining || '---' }}
        </div>
      </div>
      <div class="text-center p-3 bg-casino-blue/30 rounded-lg">
        <div class="text-sm text-gray-400 mb-1">Processing Speed</div>
        <div class="text-lg font-medium text-gray-200">
          {{ processingSpeed.toFixed(0) }} sim/sec
        </div>
      </div>
    </div>

    <div v-if="partialResults?.winsByClass" class="mb-6">
      <h4 class="text-lg font-medium text-gray-200 mb-3">
        Win Distribution (Live)
      </h4>
      <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
        <div
          v-for="classNum in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]"
          :key="classNum"
          class="text-center p-2 bg-casino-blue/50 rounded"
        >
          <div class="text-xs text-gray-400">Class {{ classNum }}</div>
          <div
            class="text-sm font-medium"
            :class="
              getProgressWinClassColor(
                classNum,
                partialResults?.winsByClass || {}
              )
            "
          >
            {{ partialResults.winsByClass[classNum] || 0 }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="canCancel" class="text-center">
      <button
        class="bg-red-600 text-white px-4 py-2 rounded-md font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-casino-blue-dark transition duration-150"
        @click="$emit('cancel')"
      >
        Cancel Simulation
      </button>
      <p class="text-xs text-gray-500 mt-2">
        Simulation will stop after current batch completes
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { formatDuration as formatTime } from '~/utils/time'
import { getProgressWinClassColor } from '~/utils/winClassColors'

const props = defineProps({
  currentSimulation: { type: Number, default: 0 },
  totalSimulations: { type: Number, required: true },
  elapsedTime: { type: Number, default: 0 },
  estimatedTimeRemaining: { type: String, default: null },
  canCancel: { type: Boolean, default: true },
  partialResults: {
    type: Object as PropType<{
      simulationsCompleted: number
      totalWins: number
      winPercentage: number
      currentROI: number
      netProfit: number
      maxWin: number
      winsByClass: Record<number, number>
    }>,
    default: null,
  },
})

defineEmits<{ cancel: [] }>()

const progressPercentage = computed(() => {
  if (props.totalSimulations === 0) return 0
  return Math.min((props.currentSimulation / props.totalSimulations) * 100, 100)
})

const processingSpeed = computed(() => {
  if (props.elapsedTime === 0) return 0
  return (props.currentSimulation / props.elapsedTime) * 1000
})

const winRateColor = computed(() => {
  if (!props.partialResults) return 'text-gray-400'
  const rate = props.partialResults.winPercentage
  if (rate > 20) return 'text-green-400'
  if (rate > 10) return 'text-yellow-400'
  return 'text-red-400'
})

const roiColor = computed(() => {
  if (!props.partialResults) return 'text-gray-400'
  const roi = props.partialResults.currentROI
  if (roi > 0) return 'text-green-400'
  if (roi > -50) return 'text-yellow-400'
  return 'text-red-400'
})

const formatElapsedTime = formatTime
</script>
