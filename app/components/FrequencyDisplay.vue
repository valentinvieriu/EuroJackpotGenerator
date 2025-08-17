<template>
  <div>
    <div
      v-if="isLoadingFrequencies"
      class="flex items-center gap-2 text-content-muted text-sm"
    >
      <div
        class="animate-spin w-4 h-4 border-2 border-border-primary border-t-transparent rounded-full"
      ></div>
      Loading frequency data...
    </div>

    <div v-else-if="hasFrequencyError" class="text-red-400 text-sm">
      Unable to load frequency data. Using default weighting.
    </div>

    <div v-else-if="hasFrequencyData" class="space-y-4">
      <!-- Statistical Summary -->
      <div
        v-if="frequencyStats"
        class="text-xs text-content-muted bg-surface-primary/20 rounded p-2"
      >
        <div class="font-medium mb-1">Historical Data Analysis</div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>Total draws: {{ frequencyStats.totalDraws }}</div>
          <div>
            Expected frequency: ~{{ frequencyStats.expectedMainFreq }} (main),
            ~{{ frequencyStats.expectedEuroFreq }} (euro)
          </div>
        </div>
      </div>

      <!-- Main Numbers (1-50) -->
      <div>
        <div class="text-xs text-content-muted mb-3">Main Numbers (1-50):</div>
        <div class="grid grid-cols-5 sm:grid-cols-10 gap-2">
          <div
            v-for="number in allMainNumbers"
            :key="`main-${number.number}`"
            class="flex flex-col items-center p-2 bg-surface-primary/30 rounded border border-casino-blue-light/20 hover:bg-surface-primary/50 transition-colors cursor-pointer"
            :title="
              getFrequencyTooltip(
                number,
                frequencyStats?.totalDraws || 0,
                frequencyStats?.expectedMainFreq || 0
              )
            "
          >
            <div class="text-sm font-medium text-brand-gold-light mb-1">
              {{ number.number }}
            </div>
            <div class="w-full bg-gray-700 rounded-full h-1.5 mb-1">
              <div
                class="h-1.5 rounded-full transition-all duration-300"
                :class="
                  getFrequencyBarColor(
                    number.value,
                    frequencyStats?.expectedMainFreq || 0
                  )
                "
                :style="{
                  width: `${getFrequencyPercentage(
                    number.value,
                    Math.max(...allMainNumbers.map((n) => n.value))
                  )}%`,
                }"
              />
            </div>
            <div class="text-xs text-content-muted">{{ number.value }}</div>
          </div>
        </div>
      </div>

      <!-- Euro Numbers (1-12) -->
      <div>
        <div class="text-xs text-content-muted mb-3">Euro Numbers (1-12):</div>
        <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
          <div
            v-for="number in allEuroNumbers"
            :key="`euro-${number.number}`"
            class="flex flex-col items-center p-2 bg-surface-primary/30 rounded border border-casino-blue-light/20 hover:bg-surface-primary/50 transition-colors cursor-pointer"
            :title="
              getFrequencyTooltip(
                number,
                frequencyStats?.totalDraws || 0,
                frequencyStats?.expectedEuroFreq || 0
              )
            "
          >
            <div class="text-sm font-medium text-blue-400 mb-1">
              {{ number.number }}
            </div>
            <div class="w-full bg-gray-700 rounded-full h-1.5 mb-1">
              <div
                class="h-1.5 rounded-full transition-all duration-300"
                :class="
                  getFrequencyBarColor(
                    number.value,
                    frequencyStats?.expectedEuroFreq || 0
                  )
                "
                :style="{
                  width: `${getFrequencyPercentage(
                    number.value,
                    Math.max(...allEuroNumbers.map((n) => n.value))
                  )}%`,
                }"
              />
            </div>
            <div class="text-xs text-content-muted">{{ number.value }}</div>
          </div>
        </div>
      </div>

      <div class="text-xs text-content-muted italic">
        Numbers weighted by √(frequency) using Efraimidis-Spirakis algorithm.
        Past patterns don't predict future draws.
      </div>
    </div>

    <div v-else class="text-content-muted text-sm">
      No frequency data available. Using default weighting.
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useTicketsStore } from '~~/stores/tickets'

// Follow "dumb component" pattern - only consume reactive state
const ticketsStore = useTicketsStore()
const {
  isLoadingFrequencies,
  hasFrequencyError,
  hasFrequencyData,
  allMainNumbers,
  allEuroNumbers,
  frequencyStats,
} = storeToRefs(ticketsStore)

// Helper functions for visual styling and tooltips

const getFrequencyTooltip = (
  number: { number: number; value: number },
  totalDraws: number,
  expected: number
) => {
  const percentage =
    totalDraws > 0 ? ((number.value / totalDraws) * 100).toFixed(1) : '0.0'
  const vs =
    expected > 0 ? ((number.value / expected - 1) * 100).toFixed(0) : '0'
  const smoothedWeight = Math.sqrt(number.value).toFixed(1)

  return (
    `Number ${number.number}: Drawn ${number.value} times (${percentage}% of draws)\n` +
    `Expected: ~${expected.toFixed(0)} draws (${vs > '0' ? '+' : ''}${vs}% vs expected)\n` +
    `Smoothed weight: ${smoothedWeight} (√${number.value})`
  )
}

// Bar chart calculation functions (adapted from BatchSimulationResults)
const getFrequencyPercentage = (value: number, maxValue: number): number => {
  if (maxValue === 0) return 0
  return (value / maxValue) * 100
}

const getFrequencyBarColor = (value: number, expected: number): string => {
  const ratio = value / expected
  if (ratio >= 1.15) {
    // High frequency (15%+ above expected)
    return 'bg-brand-gold'
  } else if (ratio >= 1.05) {
    // Medium frequency (5-15% above expected)
    return 'bg-brand-gold/70'
  } else if (ratio <= 0.85) {
    // Low frequency (15%+ below expected)
    return 'bg-gray-500'
  } else {
    // Normal frequency
    return 'bg-brand-gold/40'
  }
}
</script>
