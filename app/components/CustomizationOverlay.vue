<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    @click.self="closeOverlay"
  >
    <div
      class="bg-casino-blue-dark rounded-xl shadow-2xl border border-casino-blue-light/30 max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
    >
      <!-- Header -->
      <div class="flex justify-between items-center p-6 pb-4">
        <h2 class="text-2xl font-bold text-casino-gold-light">
          Customize Your Tickets
        </h2>
        <button
          class="text-gray-400 hover:text-gray-200 transition duration-150 p-2"
          title="Close"
          @click="closeOverlay"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto px-6 text-left">
        <!-- Customization Form -->
        <form @submit.prevent="handleGenerate">
          <div class="flex flex-col sm:flex-row gap-4 mb-6 items-end">
            <!-- Ticket Type -->
            <div class="flex-1">
              <label
                for="ticketType"
                class="mb-2 block text-gray-400 text-sm font-medium"
              >
                Pick Format:
              </label>
              <select
                id="ticketType"
                v-model="selectedTicketType"
                class="w-full px-3 py-2 border border-casino-blue-light/50 bg-casino-blue rounded-md focus:outline-none focus:ring-2 focus:ring-casino-gold focus:border-casino-gold text-gray-200"
                aria-label="Select Ticket System Type"
              >
                <option
                  v-for="type in ticketTypes"
                  :key="type.label"
                  :value="type"
                  class="bg-casino-blue-dark text-gray-200"
                >
                  {{ type.label }} (€{{ type.price.toFixed(2) }})
                </option>
              </select>
            </div>

            <!-- Quantity -->
            <div class="flex-shrink-0 w-full sm:w-auto">
              <label class="mb-2 block text-gray-400 text-sm font-medium">
                Quantity:
              </label>
              <StepperInput
                v-model="ticketCount"
                :min="1"
                :max="TICKET_COUNT_MAX"
              />
            </div>
          </div>

          <!-- Selection Method -->
          <div class="mt-8 pb-20">
            <label
              for="selectionMethodDropdown"
              class="mb-3 block text-gray-400 text-sm font-medium"
            >
              Selection Method:
            </label>

            <!-- Dropdown Selector -->
            <select
              id="selectionMethodDropdown"
              v-model="selectionMethod"
              class="w-full px-3 py-2 border border-casino-blue-light/50 bg-casino-blue rounded-md focus:outline-none focus:ring-2 focus:ring-casino-gold focus:border-casino-gold text-gray-200 mb-4"
            >
              <option value="random" class="bg-casino-blue-dark text-gray-200">
                Random (recommended) - Pure random number selection
              </option>
              <option
                value="unpopular"
                class="bg-casino-blue-dark text-gray-200"
              >
                Random (unpopular) - Avoids common patterns to minimise prize
                sharing
              </option>
              <option
                value="favorites"
                class="bg-casino-blue-dark text-gray-200"
              >
                Your favorite numbers - Prioritise your chosen numbers
              </option>
              <option
                value="weighted"
                class="bg-casino-blue-dark text-gray-200"
              >
                Weighted by past frequencies - Uses historical draw data
              </option>
            </select>

            <!-- Dynamic Content Area -->
            <div
              class="mt-4 p-6 bg-casino-blue/20 rounded-lg border border-casino-blue-light/20 transition-all duration-200 text-left"
            >
              <!-- Random Method Content -->
              <div v-if="selectionMethod === 'random'">
                <p class="text-gray-300 mb-3 text-sm leading-relaxed">
                  Uses cryptographically secure random number generation for
                  completely unbiased selection, giving every combination equal
                  probability.
                </p>
                <div
                  class="text-xs text-gray-400 bg-casino-blue/30 p-3 rounded-md"
                >
                  <strong>🔒 Technical:</strong> Built on Web Crypto API. Future
                  versions may include quantum random number generation.
                </div>
              </div>

              <!-- Unpopular Method Content -->
              <div v-if="selectionMethod === 'unpopular'">
                <p class="text-gray-300 mb-3 text-sm leading-relaxed">
                  Generates multiple combinations and selects the one with
                  patterns least commonly chosen by other players, potentially
                  reducing prize sharing.
                </p>
                <UnpopularityDisplay />
              </div>

              <!-- Favorites Method Content -->
              <div v-if="selectionMethod === 'favorites'">
                <p class="text-gray-300 mb-3 text-sm leading-relaxed">
                  Prioritises your chosen numbers during generation, combined
                  with weighted selection for remaining slots.
                </p>
                <FavoriteNumbersSelector />
              </div>

              <!-- Weighted Method Content -->
              <div v-if="selectionMethod === 'weighted'">
                <p class="text-gray-300 mb-3 text-sm leading-relaxed">
                  Uses historical frequency data to weight number selection.
                  Past draws don't affect future results - purely educational.
                </p>
                <a
                  href="https://www.lotto-bayern.de/eurojackpot/statistiken/ziehungen"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-casino-gold hover:text-casino-gold-light underline text-xs mb-3 inline-block"
                >
                  Method details →
                </a>
                <FrequencyDisplay />
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Fixed Footer -->
      <div
        class="bg-casino-blue-dark border-t border-casino-blue-light/30 p-6 rounded-b-xl"
      >
        <div
          class="flex flex-col sm:flex-row justify-between items-center gap-4"
        >
          <!-- Price Display -->
          <div class="flex flex-col items-center sm:items-start">
            <span class="text-xl font-bold text-casino-gold-light">
              €{{ totalPrice.toFixed(2) }}
            </span>
            <span class="text-xs text-gray-400">
              €{{ ticketsStore.systemCost.toFixed(2) }} × {{ ticketCount }}
            </span>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              class="px-5 py-2 rounded-md font-semibold border border-navy-muted text-ivory bg-transparent hover:bg-casino-blue-light focus:outline-none focus:ring-2 focus:ring-casino-gold focus:ring-offset-2 focus:ring-offset-casino-blue-dark transition duration-150"
              @click="closeOverlay"
            >
              Cancel
            </button>

            <button
              :disabled="loading"
              type="submit"
              class="bg-gradient-to-r from-casino-gold to-casino-gold-light text-casino-blue-dark px-6 py-3 rounded-md font-bold hover:from-casino-gold-light hover:to-[#FFE55C] focus:outline-none focus:ring-2 focus:ring-casino-gold focus:ring-offset-2 focus:ring-offset-casino-blue-dark disabled:opacity-50 disabled:cursor-wait transition-all duration-150 text-lg shadow-lg"
              @click="handleGenerate"
            >
              {{
                loading
                  ? 'Generating...'
                  : hasTickets
                    ? 'Update Numbers'
                    : 'Generate Numbers'
              }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { systemPrice } from '~/utils/pricing'
import { TICKET_COUNT_MAX } from '~/utils/constants'
import StepperInput from './StepperInput.vue'
import FavoriteNumbersSelector from './FavoriteNumbersSelector.vue'
import FrequencyDisplay from './FrequencyDisplay.vue'
import UnpopularityDisplay from './UnpopularityDisplay.vue'

interface TicketType {
  label: string
  mainCount: number
  euroCount: number
  price: number
}

// Props
defineProps<{
  isOpen: boolean
}>()

// Emits
const emit = defineEmits<{
  close: []
}>()

// System presets
const systemPresets = [
  [5, 2], // standard
  [5, 3],
  [5, 4],
  [5, 5],
  [5, 6],
  [5, 7],
  [5, 8],
  [5, 9],
  [5, 10],
  [5, 11],
  [5, 12],
  [6, 2],
  [6, 3],
  [7, 2],
  [7, 3],
] as const

const ticketTypes = computed(
  (): ReadonlyArray<TicketType> =>
    systemPresets.map(([mainCount, euroCount]) => ({
      label:
        mainCount === 5 && euroCount === 2
          ? `${mainCount} main + ${euroCount} Euro numbers (standard)`
          : `${mainCount} main + ${euroCount} Euro numbers`,
      mainCount,
      euroCount,
      price: systemPrice(mainCount, euroCount),
    }))
)

// Store
const ticketsStore = useTicketsStore()

// Computed properties bound to store
const selectedTicketType = computed<TicketType>({
  get: () => {
    const { mainCount, euroCount } = ticketsStore.state.config
    const match = ticketTypes.value.find(
      (t) => t.mainCount === mainCount && t.euroCount === euroCount
    )
    return (
      match ?? {
        label:
          mainCount === 5 && euroCount === 2
            ? `${mainCount} main + ${euroCount} Euro numbers (standard)`
            : `${mainCount} main + ${euroCount} Euro numbers`,
        mainCount,
        euroCount,
        price: systemPrice(mainCount, euroCount),
      }
    )
  },
  set: (val) => {
    ticketsStore.updateConfig({
      mainCount: val.mainCount,
      euroCount: val.euroCount,
    })
  },
})

const ticketCount = computed<number>({
  get: () => ticketsStore.state.config.ticketCount,
  set: (val) => {
    const n = Number(val) || 1
    ticketsStore.updateConfig({
      ticketCount: Math.max(1, Math.min(TICKET_COUNT_MAX, n)),
    })
  },
})

const selectionMethod = computed<
  'random' | 'weighted' | 'favorites' | 'unpopular'
>({
  get: () => ticketsStore.state.config.method,
  set: (val) => ticketsStore.updateConfig({ method: val }),
})

// UI state
const loading = computed(() => ticketsStore.isGenerating)
const hasTickets = computed(() => ticketsStore.hasTickets)
const totalPrice = computed(() => ticketsStore.totalPrice)

// Event handlers
const closeOverlay = () => {
  emit('close')
}

const handleGenerate = async () => {
  if (ticketsStore.isGenerating) return

  // Switch to custom mode when generating from overlay
  ticketsStore.setMode('custom')

  // Generate tickets
  await ticketsStore.generate()

  // Close overlay after successful generation
  if (ticketsStore.hasTickets) {
    closeOverlay()
  }
}
</script>

<style scoped>
/* Ensure overlay is above everything */
.fixed {
  z-index: 9999;
}

/* Smooth transitions for accordion */
.transition-transform {
  transition: transform 0.2s ease-in-out;
}

/* Custom scrollbar for overlay content */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(59, 75, 96, 0.3);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 215, 0, 0.3);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 215, 0, 0.5);
}
</style>
