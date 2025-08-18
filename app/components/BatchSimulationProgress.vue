<template>
  <div class="casino-card-premium rounded-lg p-6">
    <div class="mb-6">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-casino-gold text-premium-glow text-xl font-semibold">
          Mass Simulation in Progress
        </h3>
        <div class="text-sm text-content-muted">
          {{ formatElapsedTime(elapsedTime) }}
        </div>
      </div>

      <div class="mb-3 h-3 w-full rounded-full bg-surface-secondary">
        <div
          class="h-3 rounded-full bg-gradient-to-r from-interactive-primary to-interactive-primary-light transition-all duration-300 ease-out"
          :style="{ width: `${progressPercentage}%` }"
        />
      </div>

      <div class="flex items-center justify-between text-sm">
        <span class="text-content-secondary">
          {{ currentSimulation.toLocaleString() }} /
          {{ totalSimulations.toLocaleString() }} simulations
        </span>
        <span class="font-medium text-brand-gold">
          {{ progressPercentage.toFixed(1) }}%
        </span>
      </div>
    </div>

    <div
      v-if="partialResults"
      class="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-casino-blue-light/20 bg-surface-primary/50 p-4 md:grid-cols-3"
    >
      <div class="text-center">
        <div class="text-sm text-content-muted">Current Win Rate</div>
        <div class="text-lg font-semibold" :class="winRateColor">
          {{ partialResults.winPercentage.toFixed(1) }}%
        </div>
        <div class="text-xs text-content-muted">
          {{ partialResults.totalWins }} /
          {{ partialResults.simulationsCompleted }} wins
        </div>
      </div>

      <div class="text-center">
        <div class="text-sm text-content-muted">Current ROI</div>
        <div class="text-lg font-semibold" :class="roiColor">
          {{ partialResults.currentROI >= 0 ? '+' : ''
          }}{{ partialResults.currentROI.toFixed(1) }}%
        </div>
        <div class="text-xs text-content-muted">
          €{{
            partialResults.netProfit.toLocaleString('en-GB', {
              minimumFractionDigits: 2,
            })
          }}
          profit/loss
        </div>
      </div>

      <div class="text-center">
        <div class="text-sm text-content-muted">Biggest Win</div>
        <div class="text-lg font-semibold text-brand-gold">
          €{{
            partialResults.maxWin.toLocaleString('en-GB', {
              minimumFractionDigits: 2,
            })
          }}
        </div>
        <div class="text-xs text-content-muted">Best single simulation</div>
      </div>
    </div>

    <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="rounded-lg bg-surface-primary/30 p-3 text-center">
        <div class="mb-1 text-sm text-content-muted">
          Estimated Time Remaining
        </div>
        <div class="text-lg font-medium text-content-secondary">
          {{ estimatedTimeRemaining || '---' }}
        </div>
      </div>
      <div class="rounded-lg bg-surface-primary/30 p-3 text-center">
        <div class="mb-1 text-sm text-content-muted">Processing Speed</div>
        <div class="text-lg font-medium text-content-secondary">
          {{ processingSpeed.toFixed(0) }} sim/sec
        </div>
      </div>
    </div>

    <div v-if="partialResults?.winsByClass" class="mb-6">
      <h4 class="mb-3 text-lg font-medium text-content-secondary">
        Win Distribution (Live)
      </h4>
      <div class="grid grid-cols-3 gap-2 md:grid-cols-6">
        <div
          v-for="classNum in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]"
          :key="classNum"
          class="rounded bg-surface-primary/50 p-2 text-center"
        >
          <div class="text-xs text-content-muted">Class {{ classNum }}</div>
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
        class="rounded-md bg-interactive-danger px-4 py-2 font-medium text-content-primary transition duration-150 hover:bg-interactive-danger-hover focus:ring-2 focus:ring-interactive-danger focus:ring-offset-2 focus:ring-offset-surface-primary focus:outline-none"
        @click="$emit('cancel')"
      >
        Cancel Simulation
      </button>
      <p class="mt-2 text-xs text-content-muted">
        Simulation will stop after current batch completes
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  WIN_RATE_EXCELLENT_THRESHOLD,
  WIN_RATE_GOOD_THRESHOLD,
} from '~/utils/constants'
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
  if (!props.partialResults) return 'text-content-muted'
  const rate = props.partialResults.winPercentage
  if (rate > WIN_RATE_EXCELLENT_THRESHOLD) return 'text-premium-emerald-400'
  if (rate > WIN_RATE_GOOD_THRESHOLD) return 'text-brand-gold-400'
  return 'text-error'
})

const roiColor = computed(() => {
  if (!props.partialResults) return 'text-content-muted'
  const roi = props.partialResults.currentROI
  if (roi > 0) return 'text-premium-emerald-400'
  if (roi > -50) return 'text-brand-gold-400'
  return 'text-error'
})

const formatElapsedTime = formatTime
</script>
