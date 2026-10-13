<template>
  <main
    class="relative z-10 container mx-auto min-h-screen px-4 py-10 sm:py-14"
  >
    <TicketGenerator />
  </main>
</template>

<script setup lang="ts">
import TicketGenerator from '~/components/TicketGenerator.vue'

// Add head metadata if needed
useHead({
  title: 'EuroJackpot Simulator & Generator',
  meta: [
    {
      name: 'description',
      content:
        'A slot machine that shows its meter: spin EuroJackpot draws, watch what you pay in and win back, and see the odds for every prize.',
    },
  ],
})
</script>
