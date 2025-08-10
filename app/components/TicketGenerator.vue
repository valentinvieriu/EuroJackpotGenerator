<template>
  <div
    :class="[
      'transition-all duration-500 ease-in-out',
      tickets.length > 0 ? 'grid grid-cols-1 lg:grid-cols-5 gap-6' : 'block',
    ]"
  >
    <!-- Left Column (40% width when split, 100% when single) -->
    <div
      :class="[
        'space-y-6 transition-all duration-500',
        tickets.length > 0 ? 'lg:col-span-2' : 'w-full',
      ]"
    >
      <!-- Generate Tickets Panel (shown when no tickets or form is open) -->
      <div
        v-if="tickets.length === 0 || showGenerationForm"
        class="bg-casino-blue-dark rounded-lg shadow-xl p-6 border border-casino-blue-light/30"
      >
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-casino-gold-light mb-2">
            {{ tickets.length === 0 ? 'Generate Tickets' : 'Modify Tickets' }}
          </h2>
          <p class="text-gray-400 text-sm">
            Configure and generate your EuroJackpot tickets
          </p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 items-end">
          <!-- Ticket Type Selection -->
          <div>
            <label
              for="ticketType"
              class="mb-2 block text-gray-400 text-sm font-medium"
              >Ticket Type:</label
            >
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
          <!-- Number of Tickets Input -->
          <div>
            <label
              for="ticketCount"
              class="mb-2 block text-gray-400 text-sm font-medium"
              >Number of Tickets:</label
            >
            <input
              id="ticketCount"
              v-model.number="ticketCount"
              type="number"
              min="1"
              :max="maxTicketsAllowed"
              class="w-full px-3 py-2 border border-casino-blue-light/50 bg-casino-blue rounded-md focus:outline-none focus:ring-2 focus:ring-casino-gold focus:border-casino-gold text-gray-200"
              aria-label="Number of Tickets to Generate"
            />
          </div>
          <!-- Total Price Display -->
          <div class="text-right sm:text-left">
            <label class="mb-2 block text-gray-400 text-sm font-medium"
              >Total Price:</label
            >
            <div class="flex items-center justify-end sm:justify-start h-10">
              <!-- Fixed height for alignment -->
              <span class="text-xl font-semibold text-casino-gold-light"
                >€{{ totalPrice.toFixed(2) }}</span
              >
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row justify-end gap-3 mt-4">
          <button
            v-if="tickets.length > 0 && showGenerationForm"
            class="bg-gray-600 text-white px-5 py-2 rounded-md font-semibold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-casino-blue-dark transition duration-150"
            @click="showGenerationForm = false"
          >
            Cancel
          </button>
          <button
            :disabled="loading"
            class="bg-casino-gold text-casino-blue-dark px-5 py-2 rounded-md font-semibold hover:bg-casino-gold-light focus:outline-none focus:ring-2 focus:ring-casino-gold focus:ring-offset-2 focus:ring-offset-casino-blue-dark disabled:opacity-50 disabled:cursor-wait transition duration-150"
            @click="generateTicketsHandler"
          >
            {{
              loading && currentAction === 'generate'
                ? 'Generating...'
                : tickets.length > 0
                  ? 'Update Tickets'
                  : 'Generate Tickets'
            }}
          </button>
        </div>
      </div>

      <!-- Generated Tickets Display -->
      <div v-if="tickets.length && !loading && !showGenerationForm">
        <div
          class="bg-casino-blue-dark rounded-lg shadow-xl p-6 border border-casino-blue-light/30"
        >
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-casino-gold-light">
              Generated Tickets ({{ tickets.length }})
            </h2>
            <div class="flex gap-2">
              <button
                class="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
                @click="showGenerationForm = true"
              >
                Modify
              </button>
              <button
                class="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-red-500"
                @click="resetTickets"
              >
                Reset
              </button>
            </div>
          </div>
          <div class="space-y-4">
            <!-- Use TicketComponent which is renamed from Ticket to avoid naming conflict -->
            <TicketComponent
              v-for="ticket in tickets"
              :key="ticket.id"
              :ticket="ticket"
              :ticket-number="ticket.id"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Right Column (60% width) - Only shown when tickets are generated -->
    <div
      v-if="tickets.length > 0"
      :class="['transition-all duration-500', 'lg:col-span-3']"
    >
      <div
        class="bg-casino-blue-dark rounded-lg shadow-xl p-6 border border-casino-blue-light/30"
      >
        <!-- Header with tabs in top-right corner -->
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold text-casino-gold-light">
            Simulation
          </h2>
          <!-- Tab Navigation in top-right -->
          <div
            v-if="!loading"
            class="flex border-b border-casino-blue-light/30"
          >
            <button
              :class="[
                'px-3 py-1 text-sm font-medium transition-colors duration-200 border-b-2 relative',
                mode === 'single'
                  ? 'text-casino-gold border-casino-gold'
                  : 'text-gray-400 border-transparent hover:text-gray-300',
              ]"
              @click="setMode('single')"
            >
              Single Draw
            </button>
            <button
              :class="[
                'px-3 py-1 text-sm font-medium transition-colors duration-200 border-b-2 relative',
                mode === 'montecarlo'
                  ? 'text-casino-gold border-casino-gold'
                  : 'text-gray-400 border-transparent hover:text-gray-300',
              ]"
              @click="setMode('montecarlo')"
            >
              Monte Carlo
            </button>
          </div>
        </div>

        <!-- Loading Indicator -->
        <div v-if="loading" class="text-center text-gray-400 my-8">
          <svg
            class="animate-spin h-8 w-8 text-casino-gold-light mx-auto"
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
          <p class="mt-2">Processing {{ currentAction }}...</p>
        </div>
        <!-- Error Display -->
        <div
          v-else-if="error"
          class="text-center text-red-400 bg-red-900/50 border border-red-500 p-4 rounded-md"
          role="alert"
        >
          {{ error }}
        </div>
        <!-- Simulation Panels -->
        <div v-else-if="!loading">
          <SingleDrawPanel
            v-if="mode === 'single'"
            :key="singlePanelKey"
            :tickets="tickets"
            :total-price="totalPrice"
            @apply-highlights="applyHighlightsOnTickets"
          />
          <MonteCarloPanel
            v-if="mode === 'montecarlo'"
            :key="montePanelKey"
            :tickets="tickets"
            :cost-per-simulation="totalPrice"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type Ref } from 'vue'
import { useRuntimeConfig } from '#app'
import type { Ticket } from '~/types/ticket'
import SingleDrawPanel from './SingleDrawPanel.vue'
import MonteCarloPanel from './MonteCarloPanel.vue'
import TicketComponent from './TicketItem.vue'

// --- Interfaces & Types ---

/** Defines the structure for different EuroJackpot system ticket types. */
interface TicketType {
  label: string // Display label (e.g., "System 5/3")
  mainCount: number // Number of main numbers in this system
  euroCount: number // Number of euro numbers in this system
  price: number // Cost per single ticket of this type
}

// --- Constants ---

// Define available ticket system types and their properties.
const ticketTypes: ReadonlyArray<TicketType> = [
  { label: 'System 5/2', mainCount: 5, euroCount: 2, price: 2.0 }, // Standard
  { label: 'System 5/3', mainCount: 5, euroCount: 3, price: 6.0 },
  { label: 'System 5/4', mainCount: 5, euroCount: 4, price: 12.0 },
  { label: 'System 5/5', mainCount: 5, euroCount: 5, price: 20.0 },
  { label: 'System 5/6', mainCount: 5, euroCount: 6, price: 30.0 },
  { label: 'System 5/7', mainCount: 5, euroCount: 7, price: 42.0 },
  { label: 'System 5/8', mainCount: 5, euroCount: 8, price: 56.0 },
  { label: 'System 5/9', mainCount: 5, euroCount: 9, price: 72.0 },
  { label: 'System 5/10', mainCount: 5, euroCount: 10, price: 90.0 },
  { label: 'System 5/11', mainCount: 5, euroCount: 11, price: 110.0 },
  { label: 'System 5/12', mainCount: 5, euroCount: 12, price: 132.0 },
  { label: 'System 6/2', mainCount: 6, euroCount: 2, price: 12.0 },
  { label: 'System 6/3', mainCount: 6, euroCount: 3, price: 36.0 },
  // Add other system types as needed, following the pattern...
  { label: 'System 7/2', mainCount: 7, euroCount: 2, price: 42.0 },
  { label: 'System 7/3', mainCount: 7, euroCount: 3, price: 126.0 },
] // Add more types from the original list if desired

const maxTicketsAllowed = 500 // Limit for the input field, matches API limit

// --- Reactive State ---

// Currently selected ticket system type from the dropdown.
const selectedTicketType: Ref<TicketType> = ref(ticketTypes[0])
// Number of tickets the user wants to generate.
const ticketCount: Ref<number> = ref(1)
// Array holding the generated or simulated tickets.
const tickets: Ref<Ticket[]> = ref([])
// Loading state flag, true during API calls.
const loading: Ref<boolean> = ref(false)
// Stores the current action ('generate' or 'simulate') for better loading messages.
const currentAction: Ref<'generate' | 'simulate' | null> = ref(null)
// Holds error messages from API calls or processing.
const error: Ref<string> = ref('')
// UI mode: 'single' draw vs 'montecarlo' batch
const mode = ref<'single' | 'montecarlo'>('single')
// Keys to force remounting panels after generation
const singlePanelKey = ref(0)
const montePanelKey = ref(0)
// Show/hide ticket generation form when tickets exist
const showGenerationForm = ref(false)

// Get runtime configuration, primarily for the API base URL.
const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBase

// --- Computed Properties ---

// Calculates the total cost based on selected type and count.
const totalPrice = computed<number>(() => {
  // Ensure ticketCount is at least 1 for calculation
  const count = Math.max(1, ticketCount.value || 1)
  return (selectedTicketType.value?.price ?? 0) * count
})

// --- Methods ---

const resetAllState = (clearTickets = false): void => {
  if (clearTickets) tickets.value = []
  error.value = ''
}

const setMode = (m: 'single' | 'montecarlo'): void => {
  mode.value = m
  error.value = ''
}

const clearTickets = (): void => {
  tickets.value = []
  error.value = ''
  // Reset panel keys to clear any previous simulation results
  singlePanelKey.value++
  montePanelKey.value++
}

const resetTickets = (): void => {
  clearTickets()
  showGenerationForm.value = false
}

/**
 * Handles the 'Generate Tickets' button click.
 * Calls the backend API to generate tickets based on user selections.
 */
const generateTicketsHandler = async (): Promise<void> => {
  // Prevent generation if already loading
  if (loading.value) return

  // Validate ticket count locally before sending request
  if (
    !Number.isInteger(ticketCount.value) ||
    ticketCount.value < 1 ||
    ticketCount.value > maxTicketsAllowed
  ) {
    error.value = `Please enter a valid number of tickets (1-${maxTicketsAllowed}).`
    return
  }

  loading.value = true
  currentAction.value = 'generate'
  resetAllState(true) // Clear previous tickets and both modes' results

  try {
    // Make API call using $fetch (Nuxt's built-in fetch wrapper)
    const generatedTickets = await $fetch<Ticket[]>(`${apiBaseUrl}/generate`, {
      method: 'POST',
      body: {
        ticketCount: ticketCount.value,
        mainCount: selectedTicketType.value.mainCount,
        euroCount: selectedTicketType.value.euroCount,
      },
      // Optional: Add timeout if $fetch doesn't have one by default
      // signal: AbortSignal.timeout(15000) // Example: 15 second timeout
    })

    // Assign the successfully generated tickets to the reactive state.
    tickets.value = generatedTickets
    // Reset children panels
    singlePanelKey.value++
    montePanelKey.value++
    // Close the generation form after successful generation
    showGenerationForm.value = false
  } catch (err: unknown) {
    // Handle errors from the $fetch call (network, HTTP errors, etc.)
    console.error('Error generating tickets:', err)
    // Try to extract a meaningful error message from the response
    const errorResponseMessage =
      err.data?.message ||
      err.data?.statusMessage ||
      err.statusText ||
      err.message ||
      'Failed to generate tickets.'
    error.value = String(errorResponseMessage)
    tickets.value = [] // Clear tickets on error
  } finally {
    loading.value = false
    currentAction.value = null
  }
}

// Single-draw logic moved into SingleDrawPanel

// Provide a helper for SingleDrawPanel to apply ticket highlighting
const applyHighlightsOnTickets = (
  updates: Array<{
    id: number
    winningMainNumbers: number[]
    winningEuroNumbers: number[]
    winClassCounts: Record<number, number>
    winClass?: number
  }>
): void => {
  const byId = new Map(updates.map((u) => [u.id, u]))
  tickets.value = tickets.value
    .map((t) => {
      const u = byId.get(t.id)
      if (!u) return t
      return {
        ...t,
        winningMainNumbers: u.winningMainNumbers,
        winningEuroNumbers: u.winningEuroNumbers,
        winClassCounts: u.winClassCounts,
        winClass: u.winClass,
      }
    })
    .sort((a, b) => {
      const A = a.winClass ?? 999
      const B = b.winClass ?? 999
      return A === B ? a.id - b.id : A - B
    })
}

// batch simulation logic moved into MonteCarloPanel
</script>

<style scoped>
/* Styles for hiding number input spinners (already present, kept for clarity) */
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type='number'] {
  -moz-appearance: textfield; /* Firefox */
}

/* Smooth layout transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Enhanced transition for grid layout changes */
@media (min-width: 1024px) {
  .grid {
    transition: grid-template-columns 500ms ease-in-out;
  }
}
</style>
