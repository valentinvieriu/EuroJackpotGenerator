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

      <!-- 1) Core Economics (per simulation) -->
      <div class="mb-6">
        <div class="casino-card rounded-lg p-4">
          <h3 class="mb-3 text-lg font-semibold text-brand-gold-light">
            Core Economics (per play)
          </h3>
          <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div class="text-center">
              <div class="text-xs text-content-muted">Stake (cost)</div>
              <div class="text-lg font-bold text-error">
                €{{ results.stakePerPlay.toFixed(2) }}
              </div>
            </div>
            <div class="text-center">
              <div class="text-xs text-content-muted">Expected payout</div>
              <div class="text-lg font-bold text-content-secondary">
                €{{ results.expectedPayoutPerPlay.toFixed(2) }}
              </div>
            </div>
            <div class="text-center">
              <div class="text-xs text-content-muted">Expected profit (EV)</div>
              <div
                class="text-lg font-bold"
                :class="
                  results.expectedProfitPerPlay >= 0
                    ? 'text-success'
                    : 'text-error'
                "
              >
                {{ results.expectedProfitPerPlay >= 0 ? '+' : '' }}€{{
                  results.expectedProfitPerPlay.toFixed(2)
                }}
              </div>
            </div>
            <div class="text-center">
              <div class="text-xs text-content-muted">RTP</div>
              <div class="text-lg font-bold text-warning">
                {{ clampTiny(results.returnToPlayer * 100).toFixed(1) }}%
              </div>
            </div>
            <div class="text-center">
              <div class="text-xs text-content-muted">House edge</div>
              <div class="text-lg font-bold text-error-light">
                {{ clampTiny(results.houseEdge * 100).toFixed(1) }}%
              </div>
            </div>
            <div class="text-center">
              <div class="text-xs text-content-muted">Loss per €1</div>
              <div class="text-lg font-bold text-error-light">
                €{{ clampTiny(results.expectedLossPerEuro).toFixed(2) }}
              </div>
            </div>
          </div>
          <div
            class="mt-3 border-t border-casino-blue-light/30 pt-2 text-center text-xs text-content-muted"
          >
            On average you
            {{ results.expectedProfitPerPlay >= 0 ? 'gain' : 'lose' }}
            €{{
              Math.abs(clampTiny(results.expectedProfitPerPlay)).toFixed(1)
            }}
            each play. RTP ~{{ (results.returnToPlayer * 100).toFixed(0) }}%
            (house edge ~{{ (results.houseEdge * 100).toFixed(0) }}%)
          </div>
        </div>
      </div>

      <!-- 2) Hit Quality (separate "any prize" from "profitable") -->
      <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="casino-card rounded-lg p-4">
          <h3 class="mb-2 text-lg font-semibold text-brand-gold-light">
            Hit Quality Analysis
          </h3>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-content-secondary"
                >Hit rate (any prize &gt; €0):</span
              >
              <span class="font-medium" :class="hitRateColor">
                {{ results.hitRate.toFixed(1) }}%
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-content-secondary">
                Profit rate (payout ≥ €{{ results.stakePerPlay.toFixed(0) }}
                per play):
              </span>
              <span class="font-medium" :class="profitRateColor">
                {{ results.profitRate.toFixed(1) }}%
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-content-secondary"
                >Avg payout per winning simulation:</span
              >
              <span class="font-medium text-content-secondary">
                €{{ results.averagePayoutWhenHit.toFixed(2) }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-content-secondary"
                >Expected plays per hit:</span
              >
              <span class="font-medium text-content-secondary">
                {{
                  results.expectedPlaysPerHit !== null &&
                  Number.isFinite(results.expectedPlaysPerHit)
                    ? `~${results.expectedPlaysPerHit.toFixed(1)}`
                    : '∞'
                }}
              </span>
            </div>
            <div
              class="flex justify-between border-t border-casino-blue-light/30 pt-2"
            >
              <span class="text-content-secondary">Avg net when you hit:</span>
              <span
                class="font-medium"
                :class="
                  results.averageNetWhenHit >= 0 ? 'text-success' : 'text-error'
                "
              >
                {{ results.averageNetWhenHit >= 0 ? '+' : '' }}€{{
                  results.averageNetWhenHit.toFixed(2)
                }}
              </span>
            </div>
          </div>
          <div
            class="mt-3 border-t border-casino-blue-light/30 pt-2 text-xs text-content-muted"
          >
            Many 'wins' are still net losses. Even when you hit, you typically
            get ~€{{ results.averagePayoutWhenHit.toFixed(0) }} on a €{{
              results.stakePerPlay.toFixed(0)
            }}
            play (≈€{{ Math.abs(results.averageNetWhenHit).toFixed(0) }} net)
          </div>
        </div>

        <!-- 3) Why Win Rate ≠ Profit -->
        <div class="casino-card rounded-lg p-4">
          <h3 class="mb-2 text-lg font-semibold text-brand-gold-light">
            Why Win Rate ≠ Profit
          </h3>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-content-secondary"
                >Needed avg payout to break even:</span
              >
              <span class="font-medium text-success-light">
                €{{ results.neededAveragePayoutToBreakEven.toFixed(2) }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-content-secondary"
                >Current payout shortfall:</span
              >
              <span class="font-medium text-error">
                €{{ results.payoutShortfall.toFixed(2) }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-content-secondary"
                >Payout multiplier needed:</span
              >
              <span class="font-medium text-warning">
                {{ fmtMultiplier(results.payoutMultiplierNeeded) }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-content-secondary"
                >Break-even hit rate needed:</span
              >
              <span class="font-medium text-warning">
                {{
                  fmtPct1OrImpossible(results.breakEvenHitRateAtCurrentPrize)
                }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-content-secondary"
                >Break-even avg prize needed:</span
              >
              <span class="font-medium text-warning">
                {{ fmtMoney0(results.breakEvenAvgPrizeAtCurrentHitRate) }}
              </span>
            </div>
            <div
              class="flex justify-between border-t border-casino-blue-light/30 pt-2"
            >
              <span class="text-content-secondary">If every play hit:</span>
              <span
                class="font-medium"
                :class="
                  results.netIfEveryPlayHit >= 0 ? 'text-success' : 'text-error'
                "
              >
                {{ results.netIfEveryPlayHit >= 0 ? '+' : '' }}€{{
                  results.netIfEveryPlayHit.toFixed(2)
                }}
                per play
              </span>
            </div>
          </div>
          <div
            class="mt-3 border-t border-casino-blue-light/30 pt-2 text-xs text-content-muted"
          >
            Break-even isn't about hitting often; it's about average payout.
            <template
              v-if="results.expectedPayoutPerPlay >= results.stakePerPlay"
            >
              At your current average payout (~€{{
                results.expectedPayoutPerPlay.toFixed(1)
              }}) you are at or above break-even per play.
            </template>
            <template v-else>
              With avg payout of ~€{{
                results.expectedPayoutPerPlay.toFixed(1)
              }}, you'd need
              {{
                fmtMultiplier(
                  results.expectedPayoutPerPlay > 0
                    ? results.neededAveragePayoutToBreakEven /
                        results.expectedPayoutPerPlay
                    : Infinity
                )
              }}
              higher payouts to break even.
            </template>
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
                  {{
                    results.winDistribution.winsByClass[String(classNum)] || 0
                  }}
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
                Most common winning class
              </div>
              <div
                v-if="bestPerformingClass"
                class="text-xs text-success-light"
              >
                Class {{ bestPerformingClass.classNum }} with
                {{ bestPerformingClass.count }} wins
              </div>
              <div v-else class="text-xs text-content-muted">
                No wins recorded
              </div>
            </div>
            <div class="casino-card rounded-lg border border-warning/30 p-3">
              <div class="text-sm font-medium text-warning-light">
                Investment Comparison
              </div>
              <div class="text-xs text-warning-light">
                Lottery:
                {{ formatReturnRate(results.returnRatePerEuro) }} return per
                euro<br />
                Casino games (typical RTP): ~95–99%<br />
                Principal-protected savings: ~100% over short horizons
              </div>
            </div>
            <div class="casino-card rounded-lg p-3">
              <div class="text-sm font-medium text-brand-gold-light">
                Educational Insight
              </div>
              <div class="text-xs text-content-secondary">
                {{ getEducationalInsight() }}
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
        type="button"
        class="rounded px-2 py-1 text-sm text-brand-gold underline transition duration-150 hover:text-brand-gold-light focus:ring-2 focus:ring-brand-gold-400 focus:outline-none"
        @click="exportResults"
      >
        Export Detailed Results
      </button>
      <button
        type="button"
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
} from '~/utils/constants'
import { computed, type PropType } from 'vue'
import type { BatchSimulationResult } from '~/schemas'
import { getWinClassProbability } from '~/utils/winProbabilities'
import { getResultsWinClassColor } from '~/utils/winClassColors'
import { formatReturnRatePercentage } from '~/utils/simulationMath'
import { clampTiny } from '~/utils/batchStatistics'

const props = defineProps({
  results: { type: Object as PropType<BatchSimulationResult>, required: true },
  tickets: {
    type: Array as PropType<import('~/schemas').Ticket[]>,
    required: true,
  },
})
defineEmits<{ reset: [] }>()

const netProfitColor = computed(() =>
  props.results.netProfit >= 0 ? 'text-premium-emerald-400' : 'text-error'
)
const roiColor = computed(() => {
  const roi = props.results.roiPercentage
  if (roi > 0) return 'text-premium-emerald-400'
  if (roi > -25) return 'text-brand-gold-400'
  return 'text-error'
})
const hitRateColor = computed(() => {
  const rate = props.results.hitRate
  if (rate > WIN_RATE_EXCELLENT_THRESHOLD) return 'text-premium-emerald-400'
  if (rate > WIN_RATE_GOOD_THRESHOLD) return 'text-brand-gold-400'
  return 'text-content-secondary'
})
const profitRateColor = computed(() => {
  const rate = props.results.profitRate
  if (rate > 5) return 'text-premium-emerald-400' // Very rare but possible
  if (rate > 1) return 'text-brand-gold-400' // Still very rare
  return 'text-error' // Expected for lotteries
})

// Format functions for display
const formatReturnRate = (rate: number): string => {
  return formatReturnRatePercentage(rate)
}

// Safe formatting functions to handle Infinity/NaN/null values
const fmtMoney0 = (n: number | null): string =>
  n !== null && Number.isFinite(n) ? `€${n.toFixed(0)}` : '—'
const fmtPct1OrImpossible = (n: number | null): string =>
  n !== null && Number.isFinite(n) && n <= 100
    ? `${n.toFixed(1)}%`
    : 'Impossible'
const fmtMultiplier = (n: number | null): string =>
  n !== null && Number.isFinite(n) ? `${n.toFixed(1)}×` : '—'

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
  return maxCount > 0 ? { classNum: bestClass, count: maxCount } : null
})

/**
 * Formats probability as user-friendly odds (e.g., "1 in 49")
 */
const formatProbabilityAsOdds = (probability: number): string => {
  if (probability === 0) return ''
  const odds = Math.round(1 / probability)
  return `1 in ${odds.toLocaleString()}`
}

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

const getClassDescription = (classNum: number): string => {
  const description = descriptions[classNum] || ''
  const probability = getWinClassProbability(classNum)
  const odds = formatProbabilityAsOdds(probability)

  return odds ? `${description} • ${odds}` : description
}

const getClassBarColor = (classNum: number): string => {
  const count = props.results.winDistribution.winsByClass[String(classNum)] || 0
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

const classMaxCount = computed(() => {
  const vals = Object.values(props.results.winDistribution.winsByClass).filter(
    (v): v is number => typeof v === 'number'
  )
  return Math.max(...vals, 1)
})

const getClassPercentage = (classNum: number): number => {
  const count = props.results.winDistribution.winsByClass[String(classNum)] || 0
  return (count / classMaxCount.value) * 100
}

const getEducationalInsight = (): string => {
  const winRate = props.results.winDistribution.winPercentage
  const avgPrize = props.results.averagePrizePerWin
  const costPerSim = props.results.stakePerPlay

  if (avgPrize < costPerSim) {
    return `Despite ${winRate.toFixed(1)}% win rate, losses occur because average prize (€${avgPrize.toFixed(2)}) < ticket cost (€${costPerSim.toFixed(2)}). This demonstrates how lottery economics work by design.`
  } else if (winRate < 50) {
    return `Win rate of ${winRate.toFixed(1)}% shows why consistent lottery profits are mathematically unlikely, even with favorable prize structures.`
  } else {
    return 'This simulation demonstrates the mathematical realities of lottery participation for educational purposes.'
  }
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
