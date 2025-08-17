<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    @click.self="closeOverlay"
  >
    <div
      class="bg-casino-blue-dark rounded-xl shadow-2xl p-6 border border-casino-blue-light/30 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
    >
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
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

      <!-- Customization Form -->
      <form @submit.prevent="handleGenerate">
        <div class="grid gap-4 mb-6 grid-cols-1 lg:grid-cols-3 items-end">
          <!-- Ticket Type -->
          <div>
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
          <div>
            <label class="mb-2 block text-gray-400 text-sm font-medium">
              Quantity:
            </label>
            <div class="flex flex-col items-start gap-3">
              <StepperInput
                v-model="ticketCount"
                :min="1"
                :max="TICKET_COUNT_MAX"
              />
            </div>
          </div>

          <!-- Total -->
          <div class="text-right sm:text-left">
            <label class="mb-2 block text-gray-400 text-sm font-medium">
              Total:
            </label>
            <div
              class="flex flex-col items-end sm:items-start justify-center h-10"
            >
              <span class="text-2xl font-bold text-casino-gold-light">
                €{{ totalPrice.toFixed(2) }}
              </span>
              <span class="text-xs text-gray-400 -mt-1">
                €{{ ticketsStore.systemCost.toFixed(2) }} × {{ ticketCount }}
              </span>
            </div>
          </div>
        </div>

        <!-- Selection Method -->
        <div class="mt-8">
          <label class="mb-3 block text-gray-400 text-sm font-medium">
            Selection Method:
          </label>
          <div class="space-y-3">
            <!-- Random Method -->
            <label
              class="flex items-center gap-3 p-3 rounded bg-casino-blue/40 border border-casino-blue-light/30 cursor-pointer hover:bg-casino-blue/60 transition-colors duration-150"
            >
              <input
                v-model="selectionMethod"
                value="random"
                type="radio"
                name="selectionMethod"
                class="w-4 h-4 text-casino-gold bg-casino-blue border-casino-blue-light focus:ring-casino-gold focus:ring-2"
              />
              <span class="text-sm text-gray-200">
                <strong>Random (recommended)</strong><br />
                <span class="text-xs text-gray-400">
                  Pure random number selection
                </span>
              </span>
            </label>

            <!-- Weighted Method -->
            <div class="space-y-0">
              <label
                class="flex items-center justify-between p-3 rounded bg-casino-blue/40 border border-casino-blue-light/30 cursor-pointer hover:bg-casino-blue/60 transition-colors duration-150"
              >
                <div class="flex items-center gap-3">
                  <input
                    v-model="selectionMethod"
                    value="weighted"
                    type="radio"
                    name="selectionMethod"
                    class="w-4 h-4 text-casino-gold bg-casino-blue border-casino-blue-light focus:ring-casino-gold focus:ring-2"
                  />
                  <span class="text-sm text-gray-200">
                    <strong>Weighted by past frequencies</strong><br />
                    <span class="text-xs text-gray-400">
                      Past draws don't affect future results.
                      <a
                        href="https://www.lotto-bayern.de/eurojackpot/statistiken/ziehungen"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-casino-gold hover:text-casino-gold-light underline"
                        @click.stop
                      >
                        Method details
                      </a>
                    </span>
                  </span>
                </div>
                <button
                  v-if="selectionMethod === 'weighted'"
                  type="button"
                  class="text-casino-gold-light transition-transform duration-200 hover:text-casino-gold"
                  :class="{ 'rotate-180': showFrequencyDetails }"
                  @click.stop="toggleFrequencyDetails"
                >
                  ▼
                </button>
              </label>

              <!-- Frequency Details Accordion -->
              <div
                v-if="selectionMethod === 'weighted' && showFrequencyDetails"
                class="mt-0 p-4 bg-casino-blue/20 border border-casino-blue-light/10 rounded-b-lg border-t-0"
              >
                <FrequencyDisplay />
              </div>
            </div>

            <!-- Favorites Method -->
            <div class="space-y-0">
              <label
                class="flex items-center justify-between p-3 rounded bg-casino-blue/40 border border-casino-blue-light/30 cursor-pointer hover:bg-casino-blue/60 transition-colors duration-150"
              >
                <div class="flex items-center gap-3">
                  <input
                    v-model="selectionMethod"
                    value="favorites"
                    type="radio"
                    name="selectionMethod"
                    class="w-4 h-4 text-casino-gold bg-casino-blue border-casino-blue-light focus:ring-casino-gold focus:ring-2"
                  />
                  <span class="text-sm text-gray-200">
                    <strong>Your favorite numbers</strong><br />
                    <span class="text-xs text-gray-400">
                      Prioritize up to 5 favorite numbers for each pool
                    </span>
                  </span>
                </div>
                <button
                  v-if="selectionMethod === 'favorites'"
                  type="button"
                  class="text-casino-gold-light transition-transform duration-200 hover:text-casino-gold"
                  :class="{ 'rotate-180': showFavoritesDetails }"
                  @click.stop="toggleFavoritesDetails"
                >
                  ▼
                </button>
              </label>

              <!-- Favorites Details Accordion -->
              <div
                v-if="selectionMethod === 'favorites' && showFavoritesDetails"
                class="mt-0 p-4 bg-casino-blue/20 border border-casino-blue-light/10 rounded-b-lg border-t-0"
              >
                <FavoriteNumbersSelector />
              </div>
            </div>

            <!-- Unpopular Method -->
            <div class="space-y-0">
              <label
                class="flex items-center justify-between p-3 rounded bg-casino-blue/40 border border-casino-blue-light/30 cursor-pointer hover:bg-casino-blue/60 transition-colors duration-150"
              >
                <div class="flex items-center gap-3">
                  <input
                    v-model="selectionMethod"
                    value="unpopular"
                    type="radio"
                    name="selectionMethod"
                    class="w-4 h-4 text-casino-gold bg-casino-blue border-casino-blue-light focus:ring-casino-gold focus:ring-2"
                  />
                  <span class="text-sm text-gray-200">
                    <strong>Random (unpopular)</strong><br />
                    <span class="text-xs text-gray-400">
                      Avoids common patterns to minimise prize sharing
                    </span>
                  </span>
                </div>
                <button
                  v-if="selectionMethod === 'unpopular'"
                  type="button"
                  class="text-casino-gold-light transition-transform duration-200 hover:text-casino-gold"
                  :class="{ 'rotate-180': showUnpopularDetails }"
                  @click.stop="toggleUnpopularDetails"
                >
                  ▼
                </button>
              </label>

              <!-- Unpopular Details Accordion -->
              <div
                v-if="selectionMethod === 'unpopular' && showUnpopularDetails"
                class="mt-0 p-4 bg-casino-blue/20 border border-casino-blue-light/10 rounded-b-lg border-t-0"
              >
                <UnpopularityDisplay />
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row justify-end gap-3 mt-8">
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
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

// Accordion state
const showFrequencyDetails = ref(false)
const showFavoritesDetails = ref(false)
const showUnpopularDetails = ref(false)

const toggleFrequencyDetails = () => {
  showFrequencyDetails.value = !showFrequencyDetails.value
}

const toggleFavoritesDetails = () => {
  showFavoritesDetails.value = !showFavoritesDetails.value
}

const toggleUnpopularDetails = () => {
  showUnpopularDetails.value = !showUnpopularDetails.value
}

// Auto-expand accordions when methods are selected
watch(selectionMethod, (newMethod) => {
  if (newMethod === 'weighted') {
    showFrequencyDetails.value = true
  } else if (newMethod === 'favorites') {
    showFavoritesDetails.value = true
  } else if (newMethod === 'unpopular') {
    showUnpopularDetails.value = true
  }
})

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
