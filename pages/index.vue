<template>
    <div class="container mx-auto px-4 py-12 min-h-screen">
      <h1 class="text-4xl md:text-5xl font-bold text-center mb-10 text-casino-gold-light tracking-wider font-serif shadow-sm">
        EuroJackpot Simulator
      </h1>
      <TicketGenerator />
      <p class="text-center text-gray-400 mt-12 text-sm">
        Disclaimer: Ticket numbers can be generated using historical frequencies, but past results do not influence future lottery draws. This is for entertainment purposes only. Play responsibly.
      </p>
    </div>
</template>

<script setup lang="ts">
import TicketGenerator from '~/components/TicketGenerator.vue'

// Add head metadata if needed
useHead({
  title: 'EuroJackpot Simulator & Generator',
  meta: [
    { name: 'description', content: 'Generate and simulate EuroJackpot tickets with a premium casino feel. Explore system tickets and check potential winnings.' }
  ],
})
</script>

<style>
/* Optional: Add global font styles or overrides here */
</style>