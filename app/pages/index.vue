<template>
  <div class="container mx-auto px-4 py-12 min-h-screen">
    <TicketGenerator />
  </div>
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
        'Generate and simulate EuroJackpot tickets with a premium casino feel. Explore system tickets and check potential winnings.',
    },
  ],
})
</script>

<style>
/* Optional: Add global font styles or overrides here */
</style>
