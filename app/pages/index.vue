<template>
  <div class="container mx-auto px-4 py-12 min-h-screen">
    <div class="text-center mb-8">
      <h1
        class="text-2xl md:text-3xl font-bold text-casino-gold-light tracking-wider font-serif shadow-sm mb-2"
      >
        EuroJackpot Simulator
      </h1>
      <p class="text-gray-400 text-sm md:text-base">
        Generate EuroJackpot number sets or simulate outcomes. This does not buy
        tickets.
      </p>
    </div>
    <TicketGenerator />
    <div class="text-center mt-12">
      <div
        class="inline-flex items-center px-3 py-2 bg-casino-blue/40 rounded-full mb-2"
      >
        <svg
          class="w-4 h-4 text-green-400 mr-2"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="text-sm text-gray-300"
          >Nothing is purchased here. No account required.</span
        >
      </div>
      <p class="text-gray-400 text-xs max-w-2xl mx-auto">
        This is for entertainment purposes only. Play responsibly.
      </p>
    </div>
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
