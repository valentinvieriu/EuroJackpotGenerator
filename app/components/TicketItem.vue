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
    <div class="flex justify-between items-start mb-3">
      <h3 class="font-semibold text-gray-200">
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
      <button
        class="text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-full p-1 transition-colors duration-200 flex-shrink-0"
        title="Delete this ticket"
        @click="emit('delete', ticket.id)"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
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
import { WIN_CLASS_TIER_1_MAX, WIN_CLASS_TIER_2_MAX } from '~/utils/constants'
import { computed } from 'vue'
import type { Ticket } from '~/schemas'
import TicketNumber from './TicketNumber.vue'

interface Props {
  ticket: Ticket
  ticketNumber: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  delete: [ticketId: number]
}>()

const isWinner = computed(() => !!props.ticket.winClass)

const winClassBreakdown = computed(() => {
  if (!props.ticket.winClassCounts) return []

  return Object.entries(props.ticket.winClassCounts)
    .map(([winClass, count]) => ({ winClass: Number(winClass), count }))
    .sort((a, b) => a.winClass - b.winClass)
})

// Read payout odds from centralized store (with fallback odds when needed)
const oddsStore = useOddsStore()
const payoutMap = computed(() => oddsStore.getPayoutMap())

const calculatePrizeAmount = (winClass: number, count: number) => {
  const prizeAmount = payoutMap.value[winClass] ?? 0
  return prizeAmount * count
}

const getPrizeTooltip = (winClass: number, count: number) => {
  const totalPrize = calculatePrizeAmount(winClass, count)
  const prizeAmount = payoutMap.value[winClass] ?? 0
  if (totalPrize > 0) return `Total Prize: €${totalPrize.toFixed(2)}`
  return `${count}×Class ${winClass} winning lines${prizeAmount === 0 ? '' : ''}`
}

const getWinClassTextClass = (winClass: number) => {
  // Higher classes (lower numbers) get more prominent gold styling
  if (winClass >= 1 && winClass <= WIN_CLASS_TIER_1_MAX) {
    return 'text-casino-gold animate-pulse'
  } else if (
    winClass >= WIN_CLASS_TIER_1_MAX + 1 &&
    winClass <= WIN_CLASS_TIER_2_MAX
  ) {
    return 'text-casino-gold-light'
  } else {
    return 'text-casino-gold-dark'
  }
}

const getWinClassChipClasses = (winClass: number) => {
  const baseClasses = 'px-2 py-1 rounded-full text-xs font-semibold'

  if (winClass >= 1 && winClass <= WIN_CLASS_TIER_1_MAX) {
    return `${baseClasses} bg-casino-gold text-casino-blue-dark shadow-lg animate-pulse`
  } else if (
    winClass >= WIN_CLASS_TIER_1_MAX + 1 &&
    winClass <= WIN_CLASS_TIER_2_MAX
  ) {
    return `${baseClasses} bg-casino-gold-light text-casino-blue-dark shadow-md`
  } else {
    return `${baseClasses} bg-casino-gold-dark text-ivory shadow-sm`
  }
}
</script>
