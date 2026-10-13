<template>
  <li :class="['ticket-row', { 'ticket-row--hit': isWinner }]">
    <div class="text-sm leading-tight">
      <span class="font-numbers text-content-secondary"
        >#{{ ticketNumber }}</span
      >
      <span
        v-if="ticket.linesCount && ticket.linesCount > 1"
        class="block text-xs text-content-muted"
      >
        {{ formatCount(ticket.linesCount) }} lines
      </span>
    </div>

    <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <div class="flex flex-wrap gap-1">
        <LottoBall
          v-for="number in ticket.mainNumbers"
          :key="`main-${number}`"
          :number="number"
          size="sm"
          :hit="mainHits.has(number)"
          :dim="hasDraw && !mainHits.has(number)"
        />
      </div>
      <div class="flex flex-wrap gap-1">
        <LottoBall
          v-for="number in ticket.euroNumbers"
          :key="`euro-${number}`"
          :number="number"
          type="euro"
          size="sm"
          :hit="euroHits.has(number)"
          :dim="hasDraw && !euroHits.has(number)"
        />
      </div>
    </div>

    <button
      v-if="removable"
      type="button"
      class="rounded-full p-1.5 text-content-muted transition-colors duration-150 hover:bg-error-dark/25 hover:text-error-light"
      :aria-label="`Remove ticket ${ticketNumber}`"
      title="Remove this ticket"
      @click="emit('delete', ticket.id)"
    >
      <svg
        class="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>

    <!-- Prize line: which matches paid, and how much -->
    <div
      v-if="wins.length > 0"
      class="col-span-full flex flex-wrap items-center gap-1.5"
    >
      <span
        v-for="win in wins"
        :key="win.winClass"
        class="chip chip--gold"
        :title="`Prize class ${win.winClass}: ${win.count} winning line${win.count === 1 ? '' : 's'}`"
      >
        <template v-if="win.count > 1">{{ formatCount(win.count) }} ×</template>
        {{ win.label }}
      </span>
      <span class="ml-auto text-sm font-semibold text-brand-gold-200">
        {{ formatEuro(totalPrize, { sign: true }) }}
      </span>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Ticket } from '~/schemas'
import LottoBall from './LottoBall.vue'
import { matchLabel } from '~/utils/prizeTable'
import { formatEuro, formatCount } from '~/utils/format'

interface Props {
  ticket: Ticket
  ticketNumber: number
  /** A draw is on the table, so numbers that missed can recede */
  hasDraw?: boolean
  /** Off while a run is playing these tickets */
  removable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hasDraw: false,
  removable: true,
})

const emit = defineEmits<{
  delete: [ticketId: number]
}>()

const mainHits = computed(() => new Set(props.ticket.winningMainNumbers ?? []))
const euroHits = computed(() => new Set(props.ticket.winningEuroNumbers ?? []))

// Read payout amounts from the centralized odds store (falls back when offline)
const oddsStore = useOddsStore()
const payoutMap = computed(() => oddsStore.getPayoutMap())

const wins = computed(() =>
  Object.entries(props.ticket.winClassCounts ?? {})
    .map(([winClass, count]) => ({ winClass: Number(winClass), count }))
    .filter((win) => win.count > 0)
    .sort((a, b) => a.winClass - b.winClass)
    .map((win) => ({ ...win, label: matchLabel(win.winClass) }))
)

const isWinner = computed(() => wins.value.length > 0)

const totalPrize = computed(() =>
  wins.value.reduce(
    (sum, win) => sum + (payoutMap.value[win.winClass] ?? 0) * win.count,
    0
  )
)
</script>
