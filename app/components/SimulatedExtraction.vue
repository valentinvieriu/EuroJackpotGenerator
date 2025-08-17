<template>
  <div class="p-4 casino-card-premium rounded-lg">
    <h3
      class="text-xl font-semibold mb-4 text-center text-casino-gold text-premium-glow tracking-wide"
    >
      Simulated Extraction
    </h3>
    <div class="flex flex-col md:flex-row justify-around items-center gap-6">
      <div class="text-center">
        <h4
          class="font-semibold text-lg mb-3 text-content-primary uppercase tracking-wider"
        >
          Main Numbers
        </h4>
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
        <h4
          class="font-semibold text-lg mb-3 text-content-primary uppercase tracking-wider"
        >
          Euro Numbers
        </h4>
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
import type { Ticket } from '~/schemas'
import TicketNumber from './TicketNumber.vue'

interface Props {
  result: Pick<Ticket, 'mainNumbers' | 'euroNumbers'>
}

defineProps<Props>()
</script>
