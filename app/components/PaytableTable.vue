<template>
  <div>
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="text-left">
            <th scope="col" class="label-plate pb-2 font-medium">Match</th>
            <th
              scope="col"
              :class="[
                'label-plate pb-2 pl-3 text-right font-medium',
                referenceColumn,
              ]"
            >
              Odds per line
            </th>
            <th
              scope="col"
              :class="[
                'label-plate pb-2 pl-3 text-right font-medium',
                referenceColumn,
              ]"
            >
              Last paid
            </th>
            <th
              scope="col"
              :class="[
                'label-plate pb-2 pl-3 text-right font-medium',
                referenceColumn,
              ]"
            >
              Paid back per €1
            </th>
            <template v-if="showHits">
              <th
                scope="col"
                class="label-plate pb-2 pl-3 text-right font-medium"
              >
                Expected
              </th>
              <th scope="col" class="label-plate pb-2 pl-4 font-medium">
                Your hits
              </th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.winClass"
            class="border-t border-border-secondary/60"
          >
            <th scope="row" class="py-2 pr-3 text-left font-normal">
              <span class="flex items-center gap-2.5">
                <span class="flex items-center gap-1.5" aria-hidden="true">
                  <span class="flex gap-0.5">
                    <span
                      v-for="i in MAIN_NUMBERS_COUNT"
                      :key="`m${i}`"
                      :class="['pip', { 'pip--on': i <= row.main }]"
                    />
                  </span>
                  <span class="flex gap-0.5">
                    <span
                      v-for="i in EURO_NUMBERS_COUNT"
                      :key="`e${i}`"
                      :class="['pip pip--euro', { 'pip--on': i <= row.euro }]"
                    />
                  </span>
                </span>
                <span
                  class="font-numbers whitespace-nowrap text-content-secondary"
                >
                  {{ row.label }}
                </span>
                <span
                  v-if="row.winClass === 1"
                  class="chip chip--gold hidden sm:inline-flex"
                >
                  Jackpot
                </span>
              </span>
            </th>
            <td
              :class="[
                'py-2 text-right whitespace-nowrap text-content-secondary tabular-nums',
                referenceColumn,
              ]"
            >
              {{ row.odds }}
            </td>
            <td
              :class="[
                'py-2 pl-3 text-right whitespace-nowrap text-content-primary tabular-nums',
                referenceColumn,
              ]"
            >
              {{ row.prize }}
            </td>
            <td
              :class="[
                'py-2 pl-3 text-right whitespace-nowrap text-content-secondary tabular-nums',
                referenceColumn,
              ]"
            >
              {{ row.longRun }}
            </td>
            <template v-if="showHits">
              <td
                class="py-2 pl-3 text-right whitespace-nowrap text-content-muted tabular-nums"
              >
                {{ row.expected }}
              </td>
              <td class="py-2 pl-4">
                <span class="flex items-center gap-2">
                  <span class="hit-track" aria-hidden="true">
                    <span
                      class="hit-bar"
                      :style="{ inlineSize: `${row.hitShare}%` }"
                    />
                    <span
                      class="hit-mark"
                      :style="{ insetInlineStart: `${row.expectedShare}%` }"
                    />
                  </span>
                  <span
                    :class="[
                      'w-12 text-right tabular-nums',
                      row.hits > 0
                        ? 'font-semibold text-content-primary'
                        : 'text-content-muted',
                    ]"
                  >
                    {{ formatCount(row.hits) }}
                  </span>
                </span>
              </td>
            </template>
          </tr>
        </tbody>
        <tfoot>
          <tr class="border-t border-border-secondary/60">
            <th scope="row" class="pt-2 pr-3 text-left font-medium">
              Any prize at all
            </th>
            <td
              :class="[
                'pt-2 text-right whitespace-nowrap text-content-secondary tabular-nums',
                referenceColumn,
              ]"
            >
              {{ formatOdds(ANY_PRIZE_PROBABILITY) }}
            </td>
            <td :colspan="showHits ? 4 : 2" :class="referenceColumn" />
          </tr>
          <tr :class="showHits ? 'hidden sm:table-row' : ''">
            <th scope="row" class="pt-1 pr-3 text-left font-medium">
              All prizes together
            </th>
            <td colspan="2" />
            <td
              class="pt-1 pl-3 text-right font-semibold whitespace-nowrap text-content-primary tabular-nums"
            >
              {{ formatCents(LONG_RUN_RETURN, 1) }}
            </td>
            <td v-if="showHits" colspan="2" />
          </tr>
        </tfoot>
      </table>
    </div>

    <p class="mt-3 text-xs leading-relaxed text-content-muted">
      <template v-if="showHits">
        The tick on each bar marks how many hits the odds predict for
        {{ formatCount(lines) }} lines.
      </template>
      Odds are exact for a single line: 5 numbers from 50 plus 2 from 12. “Last
      paid” is what the most recent draw paid each winner and changes with every
      draw. “Paid back per €1” is fixed by the game’s rules: half of all stakes
      goes to prizes, split between the classes as shown, with
      {{ formatCents(BOOSTER_FUND_RETURN, 1) }} held in a reserve that tops up
      jackpots. The other half is never paid back.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  PRIZE_CLASSES,
  ANY_PRIZE_PROBABILITY,
  LONG_RUN_RETURN,
  BOOSTER_FUND_RETURN,
  expectedHits,
} from '~/utils/prizeTable'
import { MAIN_NUMBERS_COUNT, EURO_NUMBERS_COUNT } from '~/utils/constants'
import {
  formatEuro,
  formatCents,
  formatCount,
  formatOdds,
} from '~/utils/format'

interface Props {
  /** Hits per win class from a finished run; omit to show the plain paytable */
  hits?: Record<string, number>
  /** Total lines played in that run, used for the expected column */
  lines?: number
}

const props = withDefaults(defineProps<Props>(), {
  hits: undefined,
  lines: 0,
})

const oddsStore = useOddsStore()
onMounted(() => {
  void oddsStore.fetchOdds()
})

// Cents add nothing to a six-figure prize and cost the table its width
const WHOLE_EURO_FROM = 1000

// With hits on show, phones keep match / expected / hits and drop the two
// reference columns, which are one tap away on the Paytable tab.
const referenceColumn = computed(() =>
  showHits.value ? 'hidden sm:table-cell' : ''
)

const showHits = computed(() => !!props.hits && props.lines > 0)

const formatExpected = (value: number) => {
  if (value >= 10) return formatCount(value)
  if (value >= 0.05) return value.toFixed(1)
  return '< 0.1'
}

const rows = computed(() => {
  const payouts = oddsStore.getPayoutMap()
  const classes = PRIZE_CLASSES.map((prizeClass) => {
    const hits = props.hits?.[String(prizeClass.winClass)] ?? 0
    const expected = expectedHits(prizeClass.winClass, props.lines)
    return { ...prizeClass, hits, expected }
  })

  // One shared scale so bar lengths compare across classes
  const scaleMax = Math.max(1, ...classes.flatMap((c) => [c.hits, c.expected]))

  return classes.map((c) => {
    const prize = payouts[c.winClass] ?? 0
    return {
      winClass: c.winClass,
      main: c.main,
      euro: c.euro,
      label: c.label,
      odds: formatOdds(c.probability),
      prize:
        prize > 0
          ? formatEuro(prize, { decimals: prize >= WHOLE_EURO_FROM ? 0 : 2 })
          : '—',
      longRun: formatCents(c.longRunReturn, 1),
      hits: c.hits,
      expected: formatExpected(c.expected),
      hitShare: (c.hits / scaleMax) * 100,
      expectedShare: (c.expected / scaleMax) * 100,
    }
  })
})
</script>

<style scoped>
/* Match pips: lit ones are the numbers you need */
.pip {
  inline-size: 0.5rem;
  block-size: 0.5rem;
  border-radius: 50%;
  background: oklch(1 0 0 / 0.1);
}
.pip--on {
  background: var(--color-ball-gold-mid);
  box-shadow: 0 0 6px -1px var(--color-ball-gold-mid);
}
.pip--euro.pip--on {
  background: var(--color-ball-euro-light);
  box-shadow: 0 0 6px -1px var(--color-ball-euro-light);
}

.hit-track {
  position: relative;
  flex: 1;
  min-inline-size: 4rem;
  block-size: 0.5rem;
  border-radius: 0 0.25rem 0.25rem 0;
  background: oklch(1 0 0 / 0.05);
}
.hit-bar {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  border-radius: 0 0.25rem 0.25rem 0;
  background: var(--color-chart-won);
}
.hit-mark {
  position: absolute;
  inset-block: -0.1875rem;
  inline-size: 2px;
  translate: -1px 0;
  background: var(--color-content-secondary);
}
</style>
