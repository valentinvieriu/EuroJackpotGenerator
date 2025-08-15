<template>
  <div class="space-y-6">
    <div
      class="bg-casino-blue-dark rounded-lg shadow-xl p-6 border border-casino-blue-light/30"
    >
      <h2 class="text-2xl font-semibold text-gray-200 mb-6">
        Mass Simulation Results
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div
          class="text-center p-4 bg-casino-blue/50 rounded-lg border border-casino-blue-light/20 min-h-[120px] flex flex-col justify-center"
        >
          <div class="text-sm text-gray-400 mb-1">Total Investment</div>
          <div
            class="text-lg lg:text-xl font-bold text-red-400 break-words leading-tight"
          >
            €{{
              results.totalCost.toLocaleString('en-GB', {
                minimumFractionDigits: 2,
              })
            }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ results.totalSimulations.toLocaleString() }} simulations
          </div>
        </div>

        <div
          class="text-center p-4 bg-casino-blue/50 rounded-lg border border-casino-blue-light/20 min-h-[120px] flex flex-col justify-center"
        >
          <div class="text-sm text-gray-400 mb-1">Total Winnings</div>
          <div
            class="text-lg lg:text-xl font-bold text-green-400 break-words leading-tight"
          >
            €{{
              results.totalWinnings.toLocaleString('en-GB', {
                minimumFractionDigits: 2,
              })
            }}
          </div>
          <div class="text-xs text-gray-500 mt-1">Across all simulations</div>
        </div>

        <div
          class="text-center p-4 bg-casino-blue/50 rounded-lg border border-casino-blue-light/20 min-h-[120px] flex flex-col justify-center"
        >
          <div class="text-sm text-gray-400 mb-1">Net Result</div>
          <div
            class="text-lg lg:text-xl font-bold break-words leading-tight"
            :class="netProfitColor"
          >
            {{ results.netProfit >= 0 ? '+' : '' }}€{{
              results.netProfit.toLocaleString('en-GB', {
                minimumFractionDigits: 2,
              })
            }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ results.netProfit >= 0 ? 'Profit' : 'Loss' }}
          </div>
        </div>

        <div
          class="text-center p-4 bg-casino-blue/50 rounded-lg border border-casino-blue-light/20 min-h-[120px] flex flex-col justify-center"
        >
          <div class="text-sm text-gray-400 mb-1">Return on Investment</div>
          <div
            class="text-lg lg:text-xl font-bold break-words leading-tight"
            :class="roiColor"
          >
            {{ results.roiPercentage >= 0 ? '+' : ''
            }}{{ results.roiPercentage.toFixed(1) }}%
          </div>
          <div class="text-xs text-gray-500 mt-1">Overall performance</div>
        </div>
      </div>

      <!-- Expected Value Analysis -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div
          class="p-4 bg-gradient-to-r from-casino-blue to-casino-blue-light rounded-lg border border-casino-blue-light/30"
        >
          <h3 class="text-lg font-semibold text-casino-gold-light mb-2">
            Expected Value Analysis
          </h3>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-300"
                >Average winnings per simulation:</span
              >
              <span class="font-medium text-gray-200"
                >€{{ results.expectedValue.toFixed(2) }}</span
              >
            </div>
            <div class="flex justify-between">
              <span class="text-gray-300">Cost per simulation:</span>
              <span class="font-medium text-red-300"
                >€{{ costPerSimulation.toFixed(2) }}</span
              >
            </div>
            <div
              class="flex justify-between border-t border-casino-blue-light/30 pt-2"
            >
              <span class="text-gray-300">Expected profit per sim:</span>
              <span class="font-medium" :class="expectedProfitColor">
                {{ expectedProfitPerSim >= 0 ? '+' : '' }}€{{
                  expectedProfitPerSim.toFixed(2)
                }}
              </span>
            </div>
          </div>
        </div>

        <div
          class="p-4 bg-gradient-to-r from-casino-blue to-casino-blue-light rounded-lg border border-casino-blue-light/30"
        >
          <h3 class="text-lg font-semibold text-casino-gold-light mb-2">
            Win Statistics
          </h3>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-300">Win rate:</span>
              <span class="font-medium" :class="winRateColor"
                >{{ results.winDistribution.winPercentage.toFixed(1) }}%</span
              >
            </div>
            <div class="flex justify-between">
              <span class="text-gray-300">Winning simulations:</span>
              <span class="font-medium text-gray-200">{{
                results.winDistribution.totalWins.toLocaleString()
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-300">Losing simulations:</span>
              <span class="font-medium text-red-300">{{
                results.winDistribution.totalLosses.toLocaleString()
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detailed Statistics -->
    <div
      class="bg-casino-blue-dark rounded-lg shadow-xl p-6 border border-casino-blue-light/30"
    >
      <h3 class="text-xl font-semibold text-gray-200 mb-4">
        Statistical Analysis
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="p-4 bg-casino-blue/30 rounded-lg">
          <h4 class="text-lg font-medium text-gray-200 mb-3">
            Winnings Distribution
          </h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-400">Mean:</span
              ><span class="text-gray-200"
                >€{{ results.statistics.meanWinnings.toFixed(2) }}</span
              >
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Median:</span
              ><span class="text-gray-200"
                >€{{ results.statistics.medianWinnings.toFixed(2) }}</span
              >
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Std Dev:</span
              ><span class="text-gray-200"
                >€{{ results.statistics.standardDeviation.toFixed(2) }}</span
              >
            </div>
          </div>
        </div>

        <div class="p-4 bg-casino-blue/30 rounded-lg">
          <h4 class="text-lg font-medium text-gray-200 mb-3">Percentiles</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-400">25th:</span
              ><span class="text-gray-200"
                >€{{ results.statistics.percentile25.toFixed(2) }}</span
              >
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">75th:</span
              ><span class="text-gray-200"
                >€{{ results.statistics.percentile75.toFixed(2) }}</span
              >
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">95th:</span
              ><span class="text-casino-gold"
                >€{{ results.statistics.percentile95.toFixed(2) }}</span
              >
            </div>
          </div>
        </div>

        <div class="p-4 bg-casino-blue/30 rounded-lg">
          <h4 class="text-lg font-medium text-gray-200 mb-3">Profitability</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-400">Profitable sims:</span
              ><span class="text-green-400">{{
                results.statistics.profitableSimulations.toLocaleString()
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Profit rate:</span
              ><span :class="profitRateColor"
                >{{ results.statistics.profitablePercentage.toFixed(1) }}%</span
              >
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Best result:</span
              ><span class="text-casino-gold"
                >€{{ results.statistics.maxWinnings.toFixed(2) }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Win Class Distribution -->
    <div
      class="bg-casino-blue-dark rounded-lg shadow-xl p-6 border border-casino-blue-light/30"
    >
      <h3 class="text-xl font-semibold text-gray-200 mb-4">
        Win Class Distribution
      </h3>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 class="text-lg font-medium text-gray-200 mb-3">Wins by Class</h4>
          <div class="space-y-2">
            <div
              v-for="classNum in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]"
              :key="classNum"
              class="flex items-center justify-between p-2 bg-casino-blue/30 rounded"
            >
              <span class="text-sm text-gray-300">
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
                  class="w-16 h-2 bg-casino-blue rounded-full overflow-hidden"
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
          <h4 class="text-lg font-medium text-gray-200 mb-3">Key Insights</h4>
          <div class="space-y-3">
            <div
              class="p-3 bg-gradient-to-r from-green-900/50 to-green-800/50 rounded-lg border border-green-500/30"
            >
              <div class="text-sm font-medium text-green-200">
                Best Performing Class
              </div>
              <div class="text-xs text-green-300">
                Class {{ bestPerformingClass.classNum }} with
                {{ bestPerformingClass.count }} wins
              </div>
            </div>
            <div
              class="p-3 bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 rounded-lg border border-yellow-500/30"
            >
              <div class="text-sm font-medium text-yellow-200">
                Hit Rate vs Expected
              </div>
              <div class="text-xs text-yellow-300">
                {{ winRateVsExpected }}%
                {{ winRateVsExpected > 0 ? 'above' : 'below' }} statistical
                expectation
              </div>
            </div>
            <div
              class="p-3 bg-gradient-to-r from-casino-blue to-casino-blue-light rounded-lg border border-casino-blue-light/30"
            >
              <div class="text-sm font-medium text-casino-gold-light">
                Recommendation
              </div>
              <div class="text-xs text-gray-300">{{ getRecommendation() }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="flex flex-col sm:flex-row justify-end gap-3 bg-casino-blue-dark rounded-lg shadow-xl p-4 border border-casino-blue-light/30"
    >
      <button
        v-if="results.individualResults"
        class="px-2 py-1 text-sm text-casino-gold hover:text-casino-gold-light underline transition duration-150 focus:outline-none focus:ring-2 focus:ring-casino-gold rounded"
        @click="exportResults"
      >
        Export Detailed Results
      </button>
      <button
        class="bg-gradient-to-r from-vip-orange to-vip-orange-light text-white px-4 py-2 rounded-md font-medium hover:from-vip-orange-light hover:to-[#FF7A4D] focus:outline-none focus:ring-2 focus:ring-vip-orange focus:ring-offset-2 focus:ring-offset-casino-blue-dark transition duration-150"
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
  props.results.netProfit >= 0 ? 'text-green-400' : 'text-red-400'
)
const roiColor = computed(() => {
  const roi = props.results.roiPercentage
  if (roi > 0) return 'text-green-400'
  if (roi > -25) return 'text-yellow-400'
  return 'text-red-400'
})
const expectedProfitColor = computed(() =>
  expectedProfitPerSim.value >= 0 ? 'text-green-300' : 'text-red-300'
)
const winRateColor = computed(() => {
  const rate = props.results.winDistribution.winPercentage
  if (rate > WIN_RATE_EXCELLENT_THRESHOLD) return 'text-green-400'
  if (rate > WIN_RATE_GOOD_THRESHOLD) return 'text-yellow-400'
  return 'text-red-400'
})
const profitRateColor = computed(() => {
  const rate = props.results.statistics.profitablePercentage
  if (rate > PROFIT_RATE_EXCELLENT_THRESHOLD) return 'text-green-400'
  if (rate > PROFIT_RATE_GOOD_THRESHOLD) return 'text-yellow-400'
  return 'text-red-400'
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
  if (count === 0) return 'bg-gray-600'
  switch (classNum) {
    case 1:
    case 2:
    case 3:
      return 'bg-yellow-400'
    case 4:
    case 5:
    case 6:
      return 'bg-green-400'
    case 7:
    case 8:
    case 9:
      return 'bg-blue-400'
    default:
      return 'bg-gray-400'
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
