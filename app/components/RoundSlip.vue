<template>
  <!-- The machine's printout: one line per set of tickets tried, and the sum of them all -->
  <section
    v-if="simStore.rounds.length > 0"
    class="well mt-6 p-3 sm:p-4"
    aria-labelledby="rounds-heading"
  >
    <h2 id="rounds-heading" class="label-plate mb-2 px-1">Rounds</h2>
    <div class="overflow-x-auto">
      <table class="slip w-full text-sm">
        <thead>
          <tr class="label-plate">
            <th scope="col" class="text-left">Tickets</th>
            <th scope="col">Spins</th>
            <th scope="col" class="hidden sm:table-cell">Paid in</th>
            <th scope="col" class="hidden sm:table-cell">Won back</th>
            <th scope="col">Machine kept</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="hiddenRounds > 0">
            <td colspan="5" class="text-left text-content-muted">
              {{ formatCount(hiddenRounds) }} earlier
              {{ hiddenRounds === 1 ? 'round' : 'rounds' }}, counted in the
              total
            </td>
          </tr>
          <tr v-for="row in rows" :key="row.key" :class="row.className">
            <th scope="row" class="text-left font-normal">
              {{ row.label }}
              <span v-if="row.now" class="chip ml-1 align-middle">now</span>
            </th>
            <td>{{ formatCount(row.draws) }}</td>
            <td class="hidden sm:table-cell">{{ amount(row.spent) }}</td>
            <td class="hidden sm:table-cell">{{ amount(row.won) }}</td>
            <td :class="{ 'text-success-light': isAhead(row) }">
              {{ kept(row) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ROUND_SLIP_MAX_ROWS } from '~/utils/constants'
import { formatCount, formatEuro } from '~/utils/format'
import { addLedgers, keptShare, type Ledger } from '~/utils/rounds'

interface Props {
  /** The round on the table, as far as the meters show it */
  current: Ledger
}

const props = defineProps<Props>()

const simStore = useSimulationStore()

interface Row extends Ledger {
  key: string
  label: string
  now?: boolean
  className?: string
}

const shownRounds = computed(() => simStore.rounds.slice(-ROUND_SLIP_MAX_ROWS))
const hiddenRounds = computed(
  () => simStore.rounds.length - shownRounds.value.length
)

const rows = computed<Row[]>(() => {
  const closed: Row[] = shownRounds.value.map((round, index) => ({
    ...round,
    key: `round-${hiddenRounds.value + index}`,
  }))
  const current: Row[] =
    props.current.draws > 0
      ? [
          {
            ...props.current,
            key: 'now',
            label: simStore.roundLabel,
            now: true,
          },
        ]
      : []
  const total: Row = {
    ...addLedgers(...simStore.rounds, props.current),
    key: 'total',
    label: 'Since you sat down',
    className: 'slip__total',
  }
  return [...closed, ...current, total]
})

// Whole euros once the sums grow, so the columns stay readable
const amount = (euros: number) =>
  formatEuro(euros, { decimals: euros >= 1_000 ? 0 : 2 })

const isAhead = (row: Ledger) => (keptShare(row) ?? 0) < 0

const kept = (row: Ledger) => {
  const share = keptShare(row)
  if (share === null) return '—'
  return share < 0 ? 'nothing, you are ahead' : `${Math.round(share * 100)}%`
}
</script>

<style scoped>
.slip th,
.slip td {
  padding: 0.375rem 0.5rem;
  text-align: right;
  white-space: nowrap;
}
.slip td {
  font-family: var(--font-numbers);
  font-variant-numeric: tabular-nums;
  color: var(--color-content-secondary);
}
.slip tbody th {
  color: var(--color-content-secondary);
  white-space: normal;
}
.slip tbody tr + tr {
  border-top: 1px solid oklch(1 0 0 / 0.05);
}
.slip .slip__total {
  border-top: 1px dashed oklch(1 0 0 / 0.2);
}
.slip .slip__total th,
.slip .slip__total td {
  color: var(--color-content-primary);
  font-weight: 600;
}
</style>
