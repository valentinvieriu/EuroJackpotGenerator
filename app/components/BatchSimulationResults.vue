<template>
  <div class="space-y-8">
    <header>
      <h3 class="text-lg font-semibold text-content-primary">
        After {{ formatCount(results.totalSimulations) }} draws
      </h3>
      <p class="mt-1 text-sm text-content-muted">
        That is {{ playingTime }} of playing every Tuesday and Friday.
      </p>
    </header>

    <!-- Headline figures -->
    <dl class="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <div class="well stat-tile">
        <dt class="label-plate mb-1">Paid in</dt>
        <dd class="stat-tile__value">
          {{ formatEuro(results.totalCost, { decimals: 0 }) }}
        </dd>
      </div>
      <div class="well stat-tile">
        <dt class="label-plate mb-1">Won back</dt>
        <dd class="stat-tile__value">
          {{ formatEuro(results.totalWinnings, { decimals: 0 }) }}
        </dd>
      </div>
      <div class="well stat-tile">
        <dt class="label-plate mb-1">{{ isLoss ? 'Lost' : 'Gained' }}</dt>
        <dd
          :class="[
            'stat-tile__value',
            isLoss ? 'text-error-light' : 'text-success-light',
          ]"
        >
          {{ formatEuro(Math.abs(results.netProfit), { decimals: 0 }) }}
        </dd>
      </div>
      <div class="well stat-tile">
        <dt class="label-plate mb-1">Back per €1</dt>
        <dd class="stat-tile__value">{{ centsBack }}¢</dd>
        <dd class="mt-0.5 text-xs text-content-muted">
          in this run · {{ formatCents(LONG_RUN_RETURN) }} long-run
        </dd>
      </div>
    </dl>

    <!-- Where the money went, draw by draw -->
    <section aria-labelledby="bankroll-heading">
      <h4 id="bankroll-heading" class="mb-3 font-semibold text-content-primary">
        Money in, money out
      </h4>
      <BankrollChart
        :points="chartPoints"
        :total-draws="results.totalSimulations"
        :cost-per-draw="results.stakePerPlay"
      />
    </section>

    <!-- Every euro, split -->
    <section aria-labelledby="euro-heading">
      <h4 id="euro-heading" class="mb-3 font-semibold text-content-primary">
        Where each euro went
      </h4>
      <div class="relative">
        <div
          class="meter-bar"
          role="img"
          :aria-label="`${centsBack} cents of every euro came back, ${100 - centsBack} cents stayed in the machine. The game's long-run average is ${formatCents(LONG_RUN_RETURN)} back.`"
        >
          <div
            class="meter-bar__back"
            :style="{ inlineSize: `${Math.min(100, centsBack)}%` }"
          />
          <div class="meter-bar__kept" />
        </div>
        <span
          class="long-run-mark"
          :style="{ insetInlineStart: `${LONG_RUN_RETURN * 100}%` }"
          aria-hidden="true"
        />
      </div>
      <div class="mt-2 flex justify-between gap-4 text-sm">
        <span>
          <strong class="font-semibold text-content-primary">
            {{ centsBack }}¢
          </strong>
          <span class="text-content-muted"> came back to you</span>
        </span>
        <span class="text-right">
          <strong class="font-semibold text-content-primary">
            {{ Math.max(0, 100 - centsBack) }}¢
          </strong>
          <span class="text-content-muted"> stayed in the machine</span>
        </span>
      </div>
      <p class="mt-1 text-xs text-content-muted">
        The tick marks the game’s long-run average:
        {{ formatCents(LONG_RUN_RETURN) }} back per €1.
      </p>

      <!-- Why a run lands below the average the rules promise -->
      <div
        class="well mt-4 space-y-2 p-4 text-sm leading-relaxed text-content-secondary"
      >
        <h5 class="font-semibold text-content-primary">
          This run against the long-run average
        </h5>
        <p>
          By its rules EuroJackpot pays back
          <strong class="font-semibold text-content-primary">
            {{ formatCents(LONG_RUN_RETURN) }}
          </strong>
          of every €1 staked.
          <template v-if="reach.outOfReach.length > 0">
            A run of {{ formatCount(linesPlayed) }} lines can count on only
            <strong class="font-semibold text-content-primary">
              {{ formatCents(reach.returnWithinReach) }}
            </strong>
            of that: the prizes it expects to hit at least once. The other
            <strong class="font-semibold text-content-primary">
              {{ formatCents(reach.returnOutOfReach) }}
            </strong>
            is paid out through the {{ rarePrizes }}.
          </template>
          <template v-else>
            A run of {{ formatCount(linesPlayed) }} lines is long enough to
            expect every prize class, so it should land near that average.
          </template>
        </p>
        <template v-if="reach.outOfReach.length > 0">
          <p>
            Across all of those rarer classes this run expected
            {{ expectedRareHits }}
            {{ expectedRareHits === '1.0' ? 'hit' : 'hits' }} and landed
            <strong class="font-semibold text-content-primary">{{
              formatCount(rareHits)
            }}</strong
            >.
          </p>
          <p>
            The largest part of that
            {{ formatCents(reach.returnOutOfReach) }} is the jackpot, at
            {{ formatOdds(jackpotProbability) }} per line. That is why most
            players get back far less than the
            {{ formatCents(LONG_RUN_RETURN) }} average: the average is carried
            by a handful of big winners.
          </p>
        </template>
      </div>
    </section>

    <!-- Winning often is not winning money -->
    <section class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div class="well p-4">
        <h4 class="mb-2 font-semibold text-content-primary">
          Winning often is not winning money
        </h4>
        <p class="text-sm leading-relaxed text-content-secondary">
          <strong class="font-semibold text-content-primary">
            {{ results.hitRate.toFixed(1) }}%
          </strong>
          of draws paid you something, but only
          <strong class="font-semibold text-content-primary">
            {{ results.profitRate.toFixed(1) }}%
          </strong>
          paid back at least the {{ formatEuro(results.stakePerPlay) }} you
          staked. When a draw did pay, it paid
          {{ formatEuro(results.averagePayoutWhenHit) }} on average.
        </p>
      </div>
      <div class="well p-4">
        <h4 class="mb-2 font-semibold text-content-primary">
          What a normal draw looks like
        </h4>
        <p class="text-sm leading-relaxed text-content-secondary">
          The typical draw returned
          <strong class="font-semibold text-content-primary">
            {{ formatEuro(results.statistics.medianWinnings) }}
          </strong>
          . Your best draw out of
          {{ formatCount(results.totalSimulations) }} returned
          <strong class="font-semibold text-content-primary">
            {{ formatEuro(results.statistics.maxWinnings) }}
          </strong>
          . On average each draw cost you
          {{ formatEuro(Math.abs(results.expectedProfitPerPlay)) }}.
        </p>
      </div>
    </section>

    <!-- Hits against the paytable -->
    <section aria-labelledby="hits-heading">
      <h4 id="hits-heading" class="mb-3 font-semibold text-content-primary">
        What you hit, against the odds
      </h4>
      <PaytableTable
        :hits="results.winDistribution.winsByClass"
        :lines="linesPlayed"
      />
    </section>

    <details class="well p-4 text-sm">
      <summary class="cursor-pointer font-medium text-content-secondary">
        All the numbers
      </summary>
      <dl class="mt-3 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
        <div
          v-for="row in detailRows"
          :key="row.label"
          class="flex justify-between gap-4"
        >
          <dt class="text-content-muted">{{ row.label }}</dt>
          <dd class="text-content-primary tabular-nums">{{ row.value }}</dd>
        </div>
      </dl>
    </details>

    <div class="flex flex-wrap items-center justify-end gap-4">
      <button
        v-if="results.individualResults"
        type="button"
        class="text-sm text-brand-gold underline underline-offset-4 transition-colors duration-150 hover:text-brand-gold-light"
        @click="exportResults"
      >
        Export every draw (JSON)
      </button>
      <button
        type="button"
        class="btn-casino-gold rounded-xl px-6 py-2.5 font-cta"
        @click="$emit('reset')"
      >
        Run it again
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BatchSimulationResult, Ticket } from '~/schemas'
import BankrollChart from './BankrollChart.vue'
import PaytableTable from './PaytableTable.vue'
import { combinationCount } from '~/utils/combinatorics'
import {
  splitReturnByReach,
  getPrizeClass,
  LONG_RUN_RETURN,
} from '~/utils/prizeTable'
import {
  formatEuro,
  formatCents,
  formatCount,
  formatOdds,
  formatPlayingTime,
} from '~/utils/format'

interface Props {
  results: BatchSimulationResult
  tickets: Ticket[]
  /** Cumulative paid in / won back recorded while the run streamed in */
  trajectory?: Array<{ draws: number; spent: number; won: number }>
}

const props = withDefaults(defineProps<Props>(), { trajectory: () => [] })

defineEmits<{ reset: [] }>()

const isLoss = computed(() => props.results.netProfit < 0)
const playingTime = computed(() =>
  formatPlayingTime(props.results.totalSimulations)
)
const centsBack = computed(() => Math.round(props.results.returnToPlayer * 100))

// The final totals are authoritative; make sure the chart ends exactly on them
const chartPoints = computed(() => {
  const final = {
    draws: props.results.totalSimulations,
    spent: props.results.totalCost,
    won: props.results.totalWinnings,
  }
  const earlier = props.trajectory.filter((p) => p.draws < final.draws)
  return earlier.length > 0
    ? [...earlier, final]
    : [{ draws: 0, spent: 0, won: 0 }, final]
})

const linesPlayed = computed(() => {
  const linesPerDraw = props.tickets.reduce(
    (sum, ticket) =>
      sum +
      (ticket.linesCount ??
        combinationCount(ticket.mainNumbers.length, ticket.euroNumbers.length)),
    0
  )
  return linesPerDraw * props.results.totalSimulations
})

// How much of the game's long-run payback a run of this size could collect
const reach = computed(() => splitReturnByReach(linesPlayed.value))

const rarePrizes = computed(() => {
  const rare = reach.value.outOfReach
  // Ordered jackpot-first, so the most attainable of the rare classes is the
  // one with the best odds
  const easiest = rare.reduce<(typeof rare)[number] | undefined>(
    (best, c) => (!best || c.probability > best.probability ? c : best),
    undefined
  )
  if (!easiest) return ''
  if (rare.length === 1) return 'jackpot'
  return `${rare.length} rarest prize classes (${easiest.label} up to the jackpot)`
})

const jackpotProbability = getPrizeClass(1)?.probability ?? 0

const expectedRareHits = computed(() => {
  const expected = reach.value.expectedHitsOutOfReach
  return expected >= 0.05 ? expected.toFixed(1) : 'fewer than 0.1'
})

const rareHits = computed(() =>
  reach.value.outOfReach.reduce(
    (sum, c) =>
      sum +
      (props.results.winDistribution.winsByClass[String(c.winClass)] ?? 0),
    0
  )
)

const percent = (value: number) => `${value.toFixed(1)}%`

const detailRows = computed(() => {
  const r = props.results
  const s = r.statistics
  return [
    { label: 'Stake per draw', value: formatEuro(r.stakePerPlay) },
    {
      label: 'Average payout per draw',
      value: formatEuro(r.expectedPayoutPerPlay),
    },
    {
      label: 'Average result per draw',
      value: formatEuro(r.expectedProfitPerPlay, { sign: true }),
    },
    { label: 'Draws that paid anything', value: percent(r.hitRate) },
    { label: 'Draws that ended in profit', value: percent(r.profitRate) },
    {
      label: 'Profitable draws',
      value: formatCount(s.profitableSimulations),
    },
    {
      label: 'Average payout when it paid',
      value: formatEuro(r.averagePayoutWhenHit),
    },
    {
      label: 'Average result when it paid',
      value: formatEuro(r.averageNetWhenHit, { sign: true }),
    },
    { label: 'Median payout', value: formatEuro(s.medianWinnings) },
    {
      label: 'Payout spread (std dev)',
      value: formatEuro(s.standardDeviation),
    },
    { label: '25th percentile payout', value: formatEuro(s.percentile25) },
    { label: '75th percentile payout', value: formatEuro(s.percentile75) },
    { label: '95th percentile payout', value: formatEuro(s.percentile95) },
    { label: 'Best single draw', value: formatEuro(s.maxWinnings) },
  ]
})

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

<style scoped>
/* Where the meter would stand if the run had matched the long-run average */
.long-run-mark {
  position: absolute;
  inset-block: -0.25rem;
  inline-size: 2px;
  translate: -1px 0;
  border-radius: 1px;
  background: var(--color-content-primary);
  box-shadow: 0 0 0 2px var(--color-surface-card);
}
</style>
