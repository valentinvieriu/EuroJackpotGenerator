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
        class="ml-2 font-bold text-casino-gold-light"
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
          class="text-xs px-2 py-1 rounded bg-casino-gold/20 text-casino-gold-light font-medium"
        >
          {{ count }}×Class {{ winClass }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Ticket } from '~/types/ticket'
import TicketNumber from './TicketNumber3DSimple.vue'

interface Props {
  ticket: Ticket
  ticketNumber: number
}

const props = defineProps<Props>()

const isWinner = computed(() => !!props.ticket.winClass)

const winClassBreakdown = computed(() => {
  if (!props.ticket.winClassCounts) return []

  return Object.entries(props.ticket.winClassCounts)
    .map(([winClass, count]) => ({ winClass: Number(winClass), count }))
    .sort((a, b) => a.winClass - b.winClass)
})
</script>
