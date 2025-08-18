<template>
  <div class="space-y-6">
    <div class="casino-card-premium rounded-lg p-6">
      <h2
        class="text-casino-gold text-premium-glow mb-6 text-2xl font-semibold"
      >
        Mass Simulation Results
      </h2>

      <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          class="casino-card flex min-h-[120px] flex-col justify-center rounded-lg p-4 text-center"
        >
          <div class="mb-1 text-sm text-content-muted">Total Investment</div>
          <div
            class="text-lg leading-tight font-bold break-words text-error lg:text-xl"
          >
            €{{
              results.totalCost.toLocaleString('en-GB', {
                minimumFractionDigits: 2,
              })
            }}
          </div>
          <div class="mt-1 text-xs text-content-muted">
            {{ results.totalSimulations.toLocaleString() }} simulations
          </div>
        </div>

        <div
          class="casino-card flex min-h-[120px] flex-col justify-center rounded-lg p-4 text-center"
        >
          <div class="mb-1 text-sm text-content-muted">Total Winnings</div>
          <div
            class="text-lg leading-tight font-bold break-words text-premium-emerald-400 lg:text-xl"
          >
            €{{
              results.totalWinnings.toLocaleString('en-GB', {
                minimumFractionDigits: 2,
              })
            }}
          </div>
          <div class="mt-1 text-xs text-content-muted">
            Across all simulations
          </div>
        </div>

        <div
          class="casino-card flex min-h-[120px] flex-col justify-center rounded-lg p-4 text-center"
        >
          <div class="mb-1 text-sm text-content-muted">Net Result</div>
          <div
            class="text-lg leading-tight font-bold break-words lg:text-xl"
            :class="netProfitColor"
          >
            {{ results.netProfit >= 0 ? '+' : '' }}€{{
              results.netProfit.toLocaleString('en-GB', {
                minimumFractionDigits: 2,
              })
            }}
          </div>
          <div class="mt-1 text-xs text-content-muted">
            {{ results.netProfit >= 0 ? 'Profit' : 'Loss' }}
          </div>
        </div>

        <div
          class="casino-card flex min-h-[120px] flex-col justify-center rounded-lg p-4 text-center"
        >
          <div class="mb-1 text-sm text-content-muted">
            Return on Investment
          </div>
          <div
            class="text-lg leading-tight font-bold break-words lg:text-xl"
            :class="roiColor"
          >
            {{ results.roiPercentage >= 0 ? '+' : ''
            }}{{ results.roiPercentage.toFixed(1) }}%
          </div>
          <div class="mt-1 text-xs text-content-muted">Overall performance</div>
        </div>
      </div>

      <!-- Expected Value Analysis -->
      <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="casino-card rounded-lg p-4">
          <h3 class="mb-2 text-lg font-semibold text-brand-gold-light">
            Expected Value Analysis
          </h3>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-content-secondary"
                >Average winnings per simulation:</span
              >
              <span class="font-medium text-content-secondary"
                >€{{ results.expectedValue.toFixed(2) }}</span
              >
            </div>
            <div class="flex justify-between">
              <span class="text-content-secondary">Cost per simulation:</span>
              <span class="font-medium text-error-light"
                >€{{ costPerSimulation.toFixed(2) }}</span
              >
            </div>
            <div
              class="flex justify-between border-t border-casino-blue-light/30 pt-2"
            >
              <span class="text-content-secondary"
                >Expected profit per sim:</span
              >
              <span class="font-medium" :class="expectedProfitColor">
                {{ expectedProfitPerSim >= 0 ? '+' : '' }}€{{
                  expectedProfitPerSim.toFixed(2)
                }}
              </span>
            </div>
          </div>
        </div>

        <div class="casino-card rounded-lg p-4">
          <h3 class="mb-2 text-lg font-semibold text-brand-gold-light">
            Win Statistics
          </h3>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-content-secondary">Win rate:</span>
              <span class="font-medium" :class="winRateColor"
                >{{ results.winDistribution.winPercentage.toFixed(1) }}%</span
              >
            </div>
            <div class="flex justify-between">
              <span class="text-content-secondary">Winning simulations:</span>
              <span class="font-medium text-content-secondary">{{
                results.winDistribution.totalWins.toLocaleString()
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-content-secondary">Losing simulations:</span>
              <span class="font-medium text-error-light">{{
                results.winDistribution.totalLosses.toLocaleString()
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detailed Statistics -->
    <div class="casino-card-premium rounded-lg p-6">
      <h3 class="text-casino-gold text-premium-glow mb-4 text-xl font-semibold">
        Statistical Analysis
      </h3>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-lg bg-surface-primary/30 p-4">
          <h4 class="mb-3 text-lg font-medium text-content-secondary">
            Winnings Distribution
          </h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-content-muted">Mean:</span
              ><span class="text-content-secondary"
                >€{{ results.statistics.meanWinnings.toFixed(2) }}</span
              >
            </div>
            <div class="flex justify-between">
              <span class="text-content-muted">Median:</span
              ><span class="text-content-secondary"
                >€{{ results.statistics.medianWinnings.toFixed(2) }}</span
              >
            </div>
            <div class="flex justify-between">
              <span class="text-content-muted">Std Dev:</span
              ><span class="text-content-secondary"
                >€{{ results.statistics.standardDeviation.toFixed(2) }}</span
              >
            </div>
          </div>
        </div>

        <div class="rounded-lg bg-surface-primary/30 p-4">
          <h4 class="mb-3 text-lg font-medium text-content-secondary">
            Percentiles
          </h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-content-muted">25th:</span
              ><span class="text-content-secondary"
                >€{{ results.statistics.percentile25.toFixed(2) }}</span
              >
            </div>
            <div class="flex justify-between">
              <span class="text-content-muted">75th:</span
              ><span class="text-content-secondary"
                >€{{ results.statistics.percentile75.toFixed(2) }}</span
              >
            </div>
            <div class="flex justify-between">
              <span class="text-content-muted">95th:</span
              ><span class="text-brand-gold"
                >€{{ results.statistics.percentile95.toFixed(2) }}</span
              >
            </div>
          </div>
        </div>

        <div class="rounded-lg bg-surface-primary/30 p-4">
          <h4 class="mb-3 text-lg font-medium text-content-secondary">
            Profitability
          </h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-content-muted">Profitable sims:</span
              ><span class="text-premium-emerald-400">{{
                results.statistics.profitableSimulations.toLocaleString()
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-content-muted">Profit rate:</span
              ><span :class="profitRateColor"
                >{{ results.statistics.profitablePercentage.toFixed(1) }}%</span
              >
            </div>
            <div class="flex justify-between">
              <span class="text-content-muted">Best result:</span
              ><span class="text-brand-gold"
                >€{{ results.statistics.maxWinnings.toFixed(2) }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Win Class Distribution -->
    <div class="casino-card-premium rounded-lg p-6">
      <h3 class="text-casino-gold text-premium-glow mb-4 text-xl font-semibold">
        Win Class Distribution
      </h3>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h4 class="mb-3 text-lg font-medium text-content-secondary">
            Wins by Class
          </h4>
          <div class="space-y-2">
            <div
              v-for="classNum in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]"
              :key="classNum"
              class="flex items-center justify-between rounded bg-surface-primary/30 p-2"
            >
              <span class="text-sm text-content-secondary">
                Class {{ classNum }} {{ getClassDescription(classNum) }}
              </span>
              <div class="flex items-center space-x-2">
                <span
                  class="text-sm font-medium"
                  :class="
                    getResultsWinClassColor(
                      classNum,
                      results.winDistribution.winsByClass
                    )
                  "
                >
                  {{ results.winDistribution.winsByClass[classNum] || 0 }}
                </span>
                <div
                  class="h-2 w-16 overflow-hidden rounded-full bg-surface-primary"
                >
                  <div
                    class="h-full transition-all duration-300"
                    :class="getClassBarColor(classNum)"
                    :style="{ width: `${getClassPercentage(classNum)}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 class="mb-3 text-lg font-medium text-content-secondary">
            Key Insights
          </h4>
          <div class="space-y-3">
            <div class="casino-card rounded-lg border border-success/30 p-3">
              <div class="text-sm font-medium text-success-light">
                Best Performing Class
              </div>
              <div class="text-xs text-success-light">
                Class {{ bestPerformingClass.classNum }} with
                {{ bestPerformingClass.count }} wins
              </div>
            </div>
            <div class="casino-card rounded-lg border border-warning/30 p-3">
              <div class="text-sm font-medium text-warning-light">
                Hit Rate vs Expected
              </div>
              <div class="text-xs text-warning-light">
                {{ winRateVsExpected }}%
                {{ winRateVsExpected > 0 ? 'above' : 'below' }} statistical
                expectation
              </div>
            </div>
            <div class="casino-card rounded-lg p-3">
              <div class="text-sm font-medium text-brand-gold-light">
                Recommendation
              </div>
              <div class="text-xs text-content-secondary">
                {{ getRecommendation() }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="casino-card flex flex-col justify-end gap-3 rounded-lg p-4 sm:flex-row"
    >
      <button
        v-if="results.individualResults"
        class="rounded px-2 py-1 text-sm text-brand-gold underline transition duration-150 hover:text-brand-gold-light focus:ring-2 focus:ring-brand-gold-400 focus:outline-none"
        @click="exportResults"
      >
        Export Detailed Results
      </button>
      <button
        class="btn-casino-gold focus-gold rounded-md px-4 py-2 font-cta"
        @click="$emit('reset')"
      >
        Run New Simulation
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  WIN_RATE_EXCELLENT_THRESHOLD,
  WIN_RATE_GOOD_THRESHOLD,
  PROFIT_RATE_EXCELLENT_THRESHOLD,
  PROFIT_RATE_GOOD_THRESHOLD,
  WIN_CLASS_MIN,
  WIN_CLASS_MAX,
} from '~/utils/constants'
import { computed, type PropType } from 'vue'
import type { BatchSimulationResult } from '~/schemas'
import { combinationCount } from '~/utils/combinatorics'
import { getWinClassProbability } from '~/utils/winProbabilities'
import { getResultsWinClassColor } from '~/utils/winClassColors'

/**
 * Calculates the expected win rate for a given number of lines per simulation
 * Formula: 1 - (1 - p_any)^L where p_any = 1 - ∏(1 - p_class)
 */
function calculateExpectedWinRate(linesPerSimulation: number): number {
  // Per-line probability of *any* win = sum of mutually exclusive class probabilities
  let pAny = 0
  for (let winClass = WIN_CLASS_MIN; winClass <= WIN_CLASS_MAX; winClass++) {
    pAny += getWinClassProbability(winClass)
  }
  pAny = Math.min(Math.max(pAny, 0), 1)
  const expectedWinRate =
    1 - Math.pow(1 - pAny, Math.max(linesPerSimulation, 0))
  return expectedWinRate * 100
}

const props = defineProps({
  results: { type: Object as PropType<BatchSimulationResult>, required: true },
  tickets: {
    type: Array as PropType<import('~/schemas').Ticket[]>,
    required: true,
  },
})
defineEmits<{ reset: [] }>()

const costPerSimulation = computed(
  () => props.results.totalCost / props.results.totalSimulations
)
const expectedProfitPerSim = computed(
  () => props.results.expectedValue - costPerSimulation.value
)

const netProfitColor = computed(() =>
  props.results.netProfit >= 0 ? 'text-premium-emerald-400' : 'text-error'
)
const roiColor = computed(() => {
  const roi = props.results.roiPercentage
  if (roi > 0) return 'text-premium-emerald-400'
  if (roi > -25) return 'text-brand-gold-400'
  return 'text-error'
})
const expectedProfitColor = computed(() =>
  expectedProfitPerSim.value >= 0 ? 'text-success-light' : 'text-error-light'
)
const winRateColor = computed(() => {
  const rate = props.results.winDistribution.winPercentage
  if (rate > WIN_RATE_EXCELLENT_THRESHOLD) return 'text-premium-emerald-400'
  if (rate > WIN_RATE_GOOD_THRESHOLD) return 'text-brand-gold-400'
  return 'text-error'
})
const profitRateColor = computed(() => {
  const rate = props.results.statistics.profitablePercentage
  if (rate > PROFIT_RATE_EXCELLENT_THRESHOLD) return 'text-premium-emerald-400'
  if (rate > PROFIT_RATE_GOOD_THRESHOLD) return 'text-brand-gold-400'
  return 'text-error'
})

const bestPerformingClass = computed(() => {
  let bestClass = 12
  let maxCount = 0
  Object.entries(props.results.winDistribution.winsByClass).forEach(
    ([classStr, count]) => {
      if (count > maxCount) {
        maxCount = count
        bestClass = Number(classStr)
      }
    }
  )
  return { classNum: bestClass, count: maxCount }
})

// Calculate total lines per simulation across all tickets
const linesPerSimulation = computed(() => {
  return props.tickets.reduce((total, ticket) => {
    const mainCount = ticket.mainNumbers.length
    const euroCount = ticket.euroNumbers.length
    return total + combinationCount(mainCount, euroCount)
  }, 0)
})

const winRateVsExpected = computed(() => {
  const expectedRate = calculateExpectedWinRate(linesPerSimulation.value)
  const actualRate = props.results.winDistribution.winPercentage
  return expectedRate > 0
    ? ((actualRate - expectedRate) / expectedRate) * 100
    : 0
})

/**
 * Formats probability as user-friendly odds (e.g., "1 in 49")
 */
const formatProbabilityAsOdds = (probability: number): string => {
  if (probability === 0) return ''
  const odds = Math.round(1 / probability)
  return `1 in ${odds.toLocaleString()}`
}

const getClassDescription = (classNum: number): string => {
  const descriptions: Record<number, string> = {
    1: '(5+2 Jackpot)',
    2: '(5+1)',
    3: '(5+0)',
    4: '(4+2)',
    5: '(4+1)',
    6: '(3+2)',
    7: '(4+0)',
    8: '(2+2)',
    9: '(3+1)',
    10: '(3+0)',
    11: '(1+2)',
    12: '(2+1)',
  }

  const description = descriptions[classNum] || ''
  const probability = getWinClassProbability(classNum)
  const odds = formatProbabilityAsOdds(probability)

  return odds ? `${description} • ${odds}` : description
}

const getClassBarColor = (classNum: number): string => {
  const count = props.results.winDistribution.winsByClass[classNum] || 0
  if (count === 0) return 'bg-surface-tertiary'
  switch (classNum) {
    case 1:
    case 2:
    case 3:
      return 'bg-brand-gold-400'
    case 4:
    case 5:
    case 6:
      return 'bg-premium-emerald-400'
    case 7:
    case 8:
    case 9:
      return 'bg-premium-sapphire-400'
    default:
      return 'bg-surface-elevated-2'
  }
}

const getClassPercentage = (classNum: number): number => {
  const count = props.results.winDistribution.winsByClass[classNum] || 0
  const maxCount = Math.max(
    ...Object.values(props.results.winDistribution.winsByClass).filter(
      (v) => typeof v === 'number'
    ),
    1
  )
  return (count / maxCount) * 100
}

const getRecommendation = (): string => {
  const roi = props.results.roiPercentage
  if (roi > 10)
    return 'Excellent results! Consider this strategy for real play.'
  else if (roi > 0)
    return 'Positive returns. Strategy shows promise with larger sample.'
  else if (roi > -25)
    return 'Moderate losses. Consider adjusting number selection strategy.'
  return 'High losses. Recommend reviewing system configuration.'
}

const exportResults = (): void => {
  if (!props.results.individualResults) return
  const dataStr = JSON.stringify(props.results, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `batch_simulation_results_${Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>
