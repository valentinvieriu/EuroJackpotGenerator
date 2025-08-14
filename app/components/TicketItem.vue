<template>
  <!-- TicketItem component - renamed to meet multi-word requirement -->
  <div
    :class="[
      'rounded-lg p-4 shadow-lg transition-all duration-300',
      isWinner
        ? 'bg-casino-blue-light border-2 border-casino-gold ring-2 ring-casino-gold-light/50 shadow-casino-gold/30'
        : 'bg-casino-blue-dark border border-casino-blue-light/30',
    ]"
  >
    <h3 class="font-semibold mb-3 text-gray-200">
      Ticket #{{ ticketNumber }}
      <span v-if="ticket.linesCount" class="ml-2 text-sm text-gray-400">
        ({{ ticket.linesCount }} lines)
      </span>
      <span
        v-if="ticket.winClass"
        :class="['ml-2 font-bold', getWinClassTextClass(ticket.winClass)]"
      >
        - Winner Class {{ ticket.winClass }}!
      </span>
    </h3>
    <div class="mb-3">
      <span class="font-medium text-sm text-gray-400 block mb-1"
        >Main Numbers:</span
      >
      <div class="flex flex-wrap gap-2">
        <TicketNumber
          v-for="number in ticket.mainNumbers"
          :key="'main-' + number"
          :number="number"
          :is-winner="ticket.winningMainNumbers?.includes(number) || false"
        />
      </div>
    </div>
    <div>
      <span class="font-medium text-sm text-gray-400 block mb-1"
        >Euro Numbers:</span
      >
      <div class="flex flex-wrap gap-2">
        <TicketNumber
          v-for="number in ticket.euroNumbers"
          :key="'euro-' + number"
          :number="number"
          :is-winner="ticket.winningEuroNumbers?.includes(number) || false"
          type="euro"
        />
      </div>
    </div>

    <!-- Per-class breakdown for system tickets -->
    <div
      v-if="winClassBreakdown.length > 0"
      class="mt-3 pt-3 border-t border-casino-blue-light/30"
    >
      <span class="font-medium text-sm text-gray-400 block mb-1"
        >Winning Lines:</span
      >
      <div class="flex flex-wrap gap-2">
        <span
          v-for="{ winClass, count } in winClassBreakdown"
          :key="winClass"
          :class="[getWinClassChipClasses(winClass), 'cursor-help']"
          :title="getPrizeTooltip(winClass, count)"
        >
          {{ count }}×Class {{ winClass }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Ticket, EurojackpotHistoricOdds } from '~/schemas'
import TicketNumber from './TicketNumber.vue'
import { buildOddsMap } from '~/utils/payout'

interface Props {
  ticket: Ticket
  ticketNumber: number
  winningData?: EurojackpotHistoricOdds | null
}

const props = defineProps<Props>()

const isWinner = computed(() => !!props.ticket.winClass)

const winClassBreakdown = computed(() => {
  if (!props.ticket.winClassCounts) return []

  return Object.entries(props.ticket.winClassCounts)
    .map(([winClass, count]) => ({ winClass: Number(winClass), count }))
    .sort((a, b) => a.winClass - b.winClass)
})

const oddsMap = computed(() => {
  return props.winningData
    ? buildOddsMap(props.winningData)
    : new Map<number, number>()
})

const calculatePrizeAmount = (winClass: number, count: number) => {
  const prizeAmount = oddsMap.value.get(winClass) ?? 0
  return prizeAmount * count
}

const getPrizeTooltip = (winClass: number, count: number) => {
  const totalPrize = calculatePrizeAmount(winClass, count)
  const prizeAmount = oddsMap.value.get(winClass) ?? 0

  if (totalPrize > 0) {
    return `Total Prize: €${totalPrize.toFixed(2)}`
  }
  return `${count}×Class ${winClass} winning lines${prizeAmount === 0 && props.winningData ? ' (No prize data available)' : ''}`
}

const getWinClassTextClass = (winClass: number) => {
  // Higher classes (lower numbers) get more prominent gold styling
  if (winClass >= 1 && winClass <= 3) {
    return 'text-casino-gold animate-pulse'
  } else if (winClass >= 4 && winClass <= 7) {
    return 'text-casino-gold-light'
  } else {
    return 'text-casino-gold-dark'
  }
}

const getWinClassChipClasses = (winClass: number) => {
  const baseClasses = 'px-2 py-1 rounded-full text-xs font-semibold'

  if (winClass >= 1 && winClass <= 3) {
    return `${baseClasses} bg-casino-gold text-casino-blue-dark shadow-lg animate-pulse`
  } else if (winClass >= 4 && winClass <= 7) {
    return `${baseClasses} bg-casino-gold-light text-casino-blue-dark shadow-md`
  } else {
    return `${baseClasses} bg-casino-gold-dark text-ivory shadow-sm`
  }
}
</script>
