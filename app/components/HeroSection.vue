<template>
  <div class="relative mb-8 text-center">
    <!-- Bouncing balls background -->
    <BouncingBallsCanvas />

    <div class="relative z-10 mx-auto max-w-4xl">
      <h1 class="text-hero mb-4 text-3xl md:text-4xl">EuroJackpot Simulator</h1>
      <p
        class="text-luxury-subtitle mx-auto mb-8 max-w-2xl text-base md:text-lg"
      >
        Understand lottery mathematics through realistic simulations. Generate
        tickets, run draws, and explore statistical outcomes.
      </p>

      <!-- Simple Mode CTA -->
      <div
        v-if="!hasTickets"
        class="casino-card card-interactive hover-lift mb-8 rounded-xl p-8"
      >
        <div class="mb-6">
          <div class="mb-3 text-4xl">🎰</div>
          <p class="mb-6 text-lg text-content-secondary">
            Generate random tickets and see instant results
          </p>

          <!-- Ticket Count Selector -->
          <div class="mb-6 flex items-center justify-center gap-4">
            <label class="text-sm font-medium text-content-muted">
              Tickets:
            </label>
            <StepperInput v-model="ticketCount" :min="1" :max="50" />
          </div>

          <div
            class="flex items-center justify-center gap-4 text-sm text-content-muted"
          >
            <span class="flex items-center gap-1">
              <span class="h-2 w-2 rounded-full bg-brand-gold"></span>
              5+2 standard format
            </span>
            <span class="flex items-center gap-1">
              <span class="h-2 w-2 rounded-full bg-brand-gold"></span>
              Total cost: €{{ simpleModeCost }}
            </span>
            <span class="flex items-center gap-1">
              <span class="h-2 w-2 rounded-full bg-brand-gold"></span>
              Instant simulation
            </span>
          </div>
        </div>

        <div class="space-y-4">
          <button
            :disabled="isGenerating"
            :class="[
              'btn-casino-gold font-cta-bold focus-gold relative overflow-hidden rounded-lg px-8 py-4 text-xl',
              'transform-gpu transition-all duration-300 ease-out',
              'hover:-translate-y-1 hover:scale-105 hover:shadow-2xl',
              'active:translate-y-0 active:scale-100',
              'disabled:cursor-wait disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:scale-100',
              isGenerating ? 'cursor-wait' : 'glow-gold',
            ]"
            @click="handleQuickStart"
          >
            <Transition name="hero-button-content" mode="out-in">
              <span
                v-if="!isGenerating"
                key="default"
                class="flex items-center justify-center gap-3"
              >
                <span class="text-2xl">🎲</span>
                <span>Generate Random Tickets</span>
              </span>
              <span
                v-else
                key="loading"
                class="flex items-center justify-center gap-3"
              >
                <svg
                  class="h-6 w-6 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Generating tickets...</span>
              </span>
            </Transition>
          </button>

          <div class="text-center">
            <button
              class="text-sm text-brand-gold underline transition-colors duration-200 hover:text-brand-gold-light"
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
        class="glass-luxury mb-4 inline-flex items-center rounded-full px-4 py-2"
      >
        <svg
          class="mr-2 h-4 w-4 text-premium-emerald-400"
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

<style scoped>
/* Hero button content transition animations */
.hero-button-content-enter-active,
.hero-button-content-leave-active {
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.hero-button-content-enter-from {
  opacity: 0;
  transform: translateY(15px) scale(0.9);
}

.hero-button-content-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(0.9);
}

.hero-button-content-enter-to,
.hero-button-content-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* Enhanced hero button interactions */
.btn-casino-gold {
  will-change: transform, box-shadow;
  backface-visibility: hidden;
  perspective: 1000px;
}

.btn-casino-gold:not(:disabled):hover {
  animation: hero-button-hover 0.8s ease-out;
}

.btn-casino-gold:not(:disabled):active {
  animation: hero-button-press 0.2s ease-out;
}

@keyframes hero-button-hover {
  0% {
    transform: translateY(0) scale(1);
  }
  25% {
    transform: translateY(-2px) scale(1.02);
  }
  50% {
    transform: translateY(-4px) scale(1.05);
  }
  75% {
    transform: translateY(-2px) scale(1.03);
  }
  100% {
    transform: translateY(-4px) scale(1.05);
  }
}

@keyframes hero-button-press {
  0% {
    transform: translateY(-4px) scale(1.05);
  }
  50% {
    transform: translateY(0) scale(0.98);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

/* Loading state enhancement */
.btn-casino-gold:disabled {
  position: relative;
  overflow: hidden;
}

.btn-casino-gold:disabled::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    var(--color-brand-gold-light),
    transparent
  );
  animation: hero-shimmer 2.5s infinite;
}

@keyframes hero-shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

/* Dice emoji animation on hover */
.btn-casino-gold:not(:disabled):hover .text-2xl {
  animation: dice-roll 0.6s ease-in-out;
}

@keyframes dice-roll {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(90deg) scale(1.1);
  }
  50% {
    transform: rotate(180deg) scale(1.2);
  }
  75% {
    transform: rotate(270deg) scale(1.1);
  }
}
</style>
