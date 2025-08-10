<template>
  <div
    class="bg-gradient-to-br from-casino-blue-light via-casino-blue to-casino-blue-dark rounded-lg shadow-xl p-6 mb-8 border border-casino-gold/50"
  >
    <h2
      class="text-3xl font-semibold mb-6 text-center text-casino-gold-light tracking-wide"
    >
      Simulated Extraction
    </h2>
    <div class="flex flex-col md:flex-row justify-around items-center gap-6">
      <div class="text-center">
        <h3
          class="font-semibold text-lg mb-3 text-gray-300 uppercase tracking-wider"
        >
          Main Numbers
        </h3>
        <div class="flex flex-wrap gap-3 justify-center">
          <TicketNumber
            v-for="number in result.mainNumbers"
            :key="number"
            :number="number"
            :is-winner="true"
          />
        </div>
      </div>
      <div class="text-center">
        <h3
          class="font-semibold text-lg mb-3 text-gray-300 uppercase tracking-wider"
        >
          Euro Numbers
        </h3>
        <div class="flex flex-wrap gap-3 justify-center">
          <TicketNumber
            v-for="number in result.euroNumbers"
            :key="number"
            :number="number"
            :is-winner="true"
            type="euro"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Ticket } from '~/types/ticket'
import TicketNumber from './TicketNumber.vue'

interface Props {
  result: Ticket
}

defineProps<Props>()
</script>
