<template>
  <div class="text-center mb-8">
    <div class="max-w-4xl mx-auto">
      <h1
        class="text-3xl md:text-4xl font-bold text-casino-gold-light tracking-wider font-serif shadow-sm mb-4"
      >
        EuroJackpot Simulator
      </h1>
      <p class="text-gray-400 text-base md:text-lg mb-8 max-w-2xl mx-auto">
        Understand lottery mathematics through realistic simulations. Generate
        tickets, run draws, and explore statistical outcomes.
      </p>

      <!-- Simple Mode CTA -->
      <div
        v-if="!hasTickets"
        class="bg-gradient-to-br from-casino-blue-dark to-casino-blue rounded-xl shadow-2xl p-8 mb-8 border border-casino-blue-light/30"
      >
        <div class="mb-6">
          <div class="text-4xl mb-3">🎰</div>
          <p class="text-gray-300 text-lg mb-6">
            Generate random tickets and see instant results
          </p>

          <!-- Ticket Count Selector -->
          <div class="flex items-center justify-center gap-4 mb-6">
            <label class="text-gray-400 text-sm font-medium"> Tickets: </label>
            <StepperInput v-model="ticketCount" :min="1" :max="50" />
          </div>

          <div
            class="flex items-center justify-center gap-4 text-sm text-gray-400"
          >
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 bg-casino-gold rounded-full"></span>
              5+2 standard format
            </span>
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 bg-casino-gold rounded-full"></span>
              Total cost: €{{ simpleModeCost }}
            </span>
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 bg-casino-gold rounded-full"></span>
              Instant simulation
            </span>
          </div>
        </div>

        <div class="space-y-4">
          <button
            :disabled="isGenerating"
            class="bg-gradient-to-r from-casino-gold to-casino-gold-light text-casino-blue-dark px-8 py-4 rounded-lg font-bold text-xl hover:from-casino-gold-light hover:to-[#FFE55C] focus:outline-none focus:ring-4 focus:ring-casino-gold/50 disabled:opacity-50 disabled:cursor-wait transition-all duration-200 shadow-lg transform hover:scale-105"
            @click="handleQuickStart"
          >
            {{
              isGenerating
                ? 'Generating tickets...'
                : '🎲 Generate Random Tickets'
            }}
          </button>

          <div class="text-center">
            <button
              class="text-casino-gold hover:text-casino-gold-light text-sm underline transition-colors duration-200"
              @click="handleShowCustom"
            >
              ⚙️ Want to customize? Show advanced options
            </button>
          </div>
        </div>
      </div>

      <!-- Results Summary (shown after generation) -->
      <div
        v-else-if="hasTickets && ticketsStore.isSimpleMode"
        class="bg-gradient-to-br from-casino-blue-dark to-casino-blue rounded-xl shadow-2xl p-6 mb-8 border border-casino-blue-light/30"
      >
        <div class="flex items-center justify-center gap-4 mb-4">
          <div class="text-2xl">🎯</div>
          <div class="text-center">
            <h2 class="text-xl font-bold text-casino-gold-light">
              Your {{ tickets.length }} Tickets Generated!
            </h2>
            <p class="text-gray-300 text-sm">
              Total cost: €{{ totalPrice.toFixed(2) }} •
              {{
                simulationStore.hasSingleDrawResults
                  ? 'Results ready below'
                  : 'Running simulation...'
              }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap justify-center gap-3">
          <button
            class="px-4 py-2 bg-casino-gold text-casino-blue-dark rounded-md font-medium hover:bg-casino-gold-light transition-colors duration-200"
            @click="handleNewTickets"
          >
            🎲 Try New Tickets
          </button>
          <button
            class="px-4 py-2 border border-casino-gold text-casino-gold rounded-md font-medium hover:bg-casino-gold hover:text-casino-blue-dark transition-all duration-200"
            @click="handleShowCustom"
          >
            ⚙️ Customize Settings
          </button>
        </div>
      </div>

      <!-- Customization Overlay -->
      <CustomizationOverlay
        :is-open="showCustomizationOverlay"
        @close="showCustomizationOverlay = false"
      />

      <!-- Educational disclaimer -->
      <div
        class="inline-flex items-center px-4 py-2 bg-casino-blue/40 rounded-full mb-4"
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
        <span class="text-sm text-gray-300">
          Educational tool only. No real money involved.
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  SIMPLE_MODE_SYSTEM_MAIN,
  SIMPLE_MODE_SYSTEM_EURO,
} from '~/utils/constants'
import { systemPrice } from '~/utils/pricing'
import StepperInput from './StepperInput.vue'
import CustomizationOverlay from './CustomizationOverlay.vue'

const ticketsStore = useTicketsStore()
const simulationStore = useSimulationStore()

// Overlay state
const showCustomizationOverlay = ref(false)

// Reactive ticket count - bind directly to store config
const ticketCount = computed({
  get: () => ticketsStore.state.config.ticketCount,
  set: (value) => ticketsStore.updateConfig({ ticketCount: value }),
})

// Computed properties
const hasTickets = computed(() => ticketsStore.hasTickets)
const isGenerating = computed(() => ticketsStore.isGenerating)
const tickets = computed(() => ticketsStore.state.tickets)
const totalPrice = computed(() => ticketsStore.totalPrice)

const simpleModeCost = computed(() => {
  const systemCost = systemPrice(
    SIMPLE_MODE_SYSTEM_MAIN,
    SIMPLE_MODE_SYSTEM_EURO
  )
  return (systemCost * ticketCount.value).toFixed(2)
})

// Event handlers
const handleQuickStart = async () => {
  // ticketCount is already bound to store config, so just generate
  await ticketsStore.generateSimpleTickets()
}

const handleNewTickets = async () => {
  // ticketCount is already bound to store config, so just generate
  await ticketsStore.generateSimpleTickets()
}

const handleShowCustom = () => {
  showCustomizationOverlay.value = true
}
</script>
