<template>
  <div class="relative text-center mb-8">
    <!-- Bouncing balls background -->
    <BouncingBallsCanvas />

    <div class="relative z-10 max-w-4xl mx-auto">
      <h1
        class="text-3xl md:text-4xl font-bold text-casino-gold tracking-wider font-serif text-premium-glow mb-4"
      >
        EuroJackpot Simulator
      </h1>
      <p class="text-content-muted text-base md:text-lg mb-8 max-w-2xl mx-auto">
        Understand lottery mathematics through realistic simulations. Generate
        tickets, run draws, and explore statistical outcomes.
      </p>

      <!-- Simple Mode CTA -->
      <div
        v-if="!hasTickets"
        class="casino-card rounded-xl p-8 mb-8 card-interactive hover-lift"
      >
        <div class="mb-6">
          <div class="text-4xl mb-3">🎰</div>
          <p class="text-content-secondary text-lg mb-6">
            Generate random tickets and see instant results
          </p>

          <!-- Ticket Count Selector -->
          <div class="flex items-center justify-center gap-4 mb-6">
            <label class="text-content-muted text-sm font-medium">
              Tickets:
            </label>
            <StepperInput v-model="ticketCount" :min="1" :max="50" />
          </div>

          <div
            class="flex items-center justify-center gap-4 text-sm text-content-muted"
          >
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 bg-brand-gold rounded-full"></span>
              5+2 standard format
            </span>
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 bg-brand-gold rounded-full"></span>
              Total cost: €{{ simpleModeCost }}
            </span>
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 bg-brand-gold rounded-full"></span>
              Instant simulation
            </span>
          </div>
        </div>

        <div class="space-y-4">
          <button
            :disabled="isGenerating"
            class="btn-casino-gold px-8 py-4 rounded-lg font-bold text-xl focus-gold disabled:opacity-50 disabled:cursor-wait glow-gold"
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
              class="text-brand-gold hover:text-brand-gold-light text-sm underline transition-colors duration-200"
              @click="handleShowCustom"
            >
              ⚙️ Want to customize? Show advanced options
            </button>
          </div>
        </div>
      </div>

      <!-- Customization Overlay -->
      <CustomizationOverlay
        :is-open="showCustomizationOverlay"
        @close="showCustomizationOverlay = false"
      />

      <!-- Educational disclaimer -->
      <div
        class="inline-flex items-center px-4 py-2 glass-luxury rounded-full mb-4"
      >
        <svg
          class="w-4 h-4 text-premium-emerald-400 mr-2"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="text-sm text-content-secondary">
          Educational tool only. No real money involved.
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import {
  SIMPLE_MODE_SYSTEM_MAIN,
  SIMPLE_MODE_SYSTEM_EURO,
} from '~/utils/constants'
import { systemPrice } from '~/utils/pricing'
import StepperInput from './StepperInput.vue'
import CustomizationOverlay from './CustomizationOverlay.vue'
import BouncingBallsCanvas from './BouncingBallsCanvas.vue'

const ticketsStore = useTicketsStore()

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

const handleShowCustom = () => {
  showCustomizationOverlay.value = true
}

// Global Enter key listener for better UX
const handleGlobalKeydown = (event: KeyboardEvent) => {
  // Only trigger if Enter is pressed, not generating, and we're showing the hero section
  if (event.key === 'Enter' && !isGenerating.value && !hasTickets.value) {
    // Don't trigger if user is typing in an input field
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

    handleQuickStart()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})
</script>
