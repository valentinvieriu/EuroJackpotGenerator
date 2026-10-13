<template>
  <div>
    <div class="flex items-baseline justify-between gap-3">
      <h3 class="text-lg font-semibold text-content-primary">
        Autoplay running
      </h3>
      <span class="text-sm text-content-muted tabular-nums">
        {{ formatDuration(elapsedTime) }}
        <template v-if="estimatedTimeRemaining">
          · about {{ estimatedTimeRemaining }} left
        </template>
      </span>
    </div>

    <div
      class="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-primary"
      role="progressbar"
      aria-label="Autoplay progress"
      :aria-valuenow="Math.round(progressPercentage)"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        class="h-full origin-left rounded-full bg-brand-gold transition-transform duration-300 ease-standard"
        :style="{ transform: `scaleX(${progressPercentage / 100})` }"
      />
    </div>
    <p class="mt-2 text-sm text-content-secondary tabular-nums">
      Draw {{ formatCount(currentSimulation) }} of
      {{ formatCount(totalSimulations) }}
    </p>
    <p class="mt-1 text-sm text-content-muted">
      That many draws is {{ formatPlayingTime(totalSimulations) }} of playing
      every Tuesday and Friday.
    </p>

    <div class="mt-5">
      <BankrollChart
        :points="trajectory"
        :total-draws="totalSimulations"
        :cost-per-draw="costPerDraw"
      />
    </div>

    <dl
      v-if="partialResults"
      class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      <div class="well stat-tile">
        <dt class="label-plate mb-1">Draws that paid anything</dt>
        <dd class="stat-tile__value">
          {{ partialResults.winPercentage.toFixed(1) }}%
        </dd>
      </div>
      <div class="well stat-tile">
        <dt class="label-plate mb-1">Biggest single win</dt>
        <dd class="stat-tile__value">
          {{ formatEuro(partialResults.maxWin) }}
        </dd>
      </div>
      <div class="well stat-tile">
        <dt class="label-plate mb-1">Net so far</dt>
        <dd
          :class="[
            'stat-tile__value',
            partialResults.netProfit < 0
              ? 'text-error-light'
              : 'text-success-light',
          ]"
        >
          {{ formatEuro(partialResults.netProfit, { sign: true }) }}
        </dd>
      </div>
    </dl>

    <div v-if="canCancel" class="mt-6 flex justify-end">
      <button
        type="button"
        class="rounded-xl border border-border-secondary px-4 py-2 text-sm font-medium text-content-secondary transition-colors duration-150 hover:border-error hover:text-error-light"
        @click="$emit('cancel')"
      >
        Stop autoplay
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BankrollChart from './BankrollChart.vue'
import { formatDuration } from '~/utils/time'
import { formatEuro, formatCount, formatPlayingTime } from '~/utils/format'

interface Props {
  currentSimulation?: number
  totalSimulations: number
  elapsedTime?: number
  estimatedTimeRemaining?: string | null
  canCancel?: boolean
  costPerDraw?: number
  trajectory?: Array<{ draws: number; spent: number; won: number }>
  partialResults?: {
    simulationsCompleted: number
    totalWins: number
    winPercentage: number
    currentROI: number
    netProfit: number
    maxWin: number
    winsByClass: Record<number, number>
  } | null
}

const props = withDefaults(defineProps<Props>(), {
  currentSimulation: 0,
  elapsedTime: 0,
  estimatedTimeRemaining: null,
  canCancel: true,
  costPerDraw: 0,
  trajectory: () => [],
  partialResults: null,
})

defineEmits<{ cancel: [] }>()

const progressPercentage = computed(() => {
  if (props.totalSimulations === 0) return 0
  return Math.min((props.currentSimulation / props.totalSimulations) * 100, 100)
})
</script>
