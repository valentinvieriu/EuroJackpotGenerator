<template>
  <div
    :class="[
      'transition-all duration-500 ease-in-out',
      tickets.length > 0
        ? 'space-y-6 lg:space-y-0 lg:grid lg:grid-cols-5 lg:gap-6'
        : 'block',
    ]"
  >
    <div
      :class="[
        'space-y-6 transition-all duration-500',
        tickets.length > 0 ? 'lg:col-span-2' : 'w-full',
      ]"
    >
      <div
        v-if="tickets.length === 0 || showGenerationForm"
        class="bg-casino-blue-dark rounded-lg shadow-xl p-6 border border-casino-blue-light/30"
      >
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-casino-gold-light mb-2">
            {{ tickets.length === 0 ? 'Ticket Settings' : 'Modify Tickets' }}
          </h2>
          <p class="text-gray-400 text-sm">
            Configure your EuroJackpot number generation
          </p>
        </div>

        <form @submit.prevent="generateTicketsHandler">
          <div
            :class="[
              'grid gap-4 mb-6',
              tickets.length > 0
                ? 'grid-cols-1 md:grid-cols-2 items-start' // Constrained: max 2 columns, align to top
                : 'grid-cols-1 lg:grid-cols-3 items-end', // Full width: up to 3 columns, align to bottom
            ]"
          >
            <div>
              <label
                for="ticketType"
                class="mb-2 block text-gray-400 text-sm font-medium"
                >Pick Format:</label
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

            <div>
              <label class="mb-2 block text-gray-400 text-sm font-medium"
                >Quantity:</label
              >
              <div
                :class="[
                  'flex gap-3',
                  tickets.length > 0
                    ? 'flex-col items-start' // Constrained: stack vertically
                    : 'items-center', // Full width: horizontal alignment
                ]"
              >
                <StepperInput
                  v-model="ticketCount"
                  :min="1"
                  :max="maxTicketsAllowed"
                />
                <span
                  :class="[
                    'text-sm text-gray-400',
                    tickets.length > 0 ? 'text-xs' : '', // Smaller text when constrained
                  ]"
                >
                  €{{ selectedTicketType.price.toFixed(2) }} per ticket
                </span>
              </div>
            </div>

            <div class="text-right sm:text-left">
              <label class="mb-2 block text-gray-400 text-sm font-medium"
                >Total:</label
              >
              <div
                class="flex flex-col items-end sm:items-start justify-center h-10"
              >
                <span class="text-2xl font-bold text-casino-gold-light"
                  >€{{ totalPrice.toFixed(2) }}</span
                >
                <span class="text-xs text-gray-400 -mt-1">
                  €{{ selectedTicketType.price.toFixed(2) }} × {{ ticketCount }}
                </span>
              </div>
            </div>
          </div>

          <div class="mt-8">
            <label class="mb-3 block text-gray-400 text-sm font-medium">
              Selection Method:
            </label>
            <div class="space-y-3">
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
                  <span class="text-xs text-gray-400"
                    >Pure random number selection</span
                  >
                </span>
              </label>
              <label
                class="flex items-center gap-3 p-3 rounded bg-casino-blue/40 border border-casino-blue-light/30 cursor-pointer hover:bg-casino-blue/60 transition-colors duration-150"
              >
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
              </label>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row justify-end gap-3 mt-8">
            <button
              v-if="tickets.length > 0 && showGenerationForm"
              type="button"
              class="px-5 py-2 rounded-md font-semibold border border-navy-muted text-ivory bg-transparent hover:bg-casino-blue-light focus:outline-none focus:ring-2 focus:ring-casino-gold focus:ring-offset-2 focus:ring-offset-casino-blue-dark transition duration-150"
              @click="showGenerationForm = false"
            >
              Cancel
            </button>

            <button
              :disabled="loading"
              type="submit"
              class="bg-gradient-to-r from-casino-gold to-casino-gold-light text-casino-blue-dark px-6 py-3 rounded-md font-bold hover:from-casino-gold-light hover:to-[#FFE55C] focus:outline-none focus:ring-2 focus:ring-casino-gold focus:ring-offset-2 focus:ring-offset-casino-blue-dark disabled:opacity-50 disabled:cursor-wait transition-all duration-150 text-lg shadow-lg"
            >
              {{
                loading && currentAction === 'generate'
                  ? 'Generating...'
                  : tickets.length > 0
                    ? 'Update Numbers'
                    : 'Generate Numbers'
              }}
            </button>
          </div>
        </form>
      </div>

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
                class="px-3 py-1 text-sm bg-navy-muted hover:bg-[#3B4B60] text-ivory rounded-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-casino-gold"
                @click="showGenerationForm = true"
              >
                Modify
              </button>
              <button
                class="px-3 py-1 text-sm border border-casino-gold text-casino-gold rounded-md transition duration-150 hover:bg-casino-gold hover:text-casino-blue-dark focus:outline-none focus:ring-2 focus:ring-casino-gold"
                @click="resetTickets"
              >
                Reset
              </button>
            </div>
          </div>

          <div class="space-y-4">
            <TicketComponent
              v-for="ticket in tickets"
              :key="ticket.id"
              :ticket="ticket"
              :ticket-number="ticket.id"
              :winning-data="latestWinningData"
            />
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="tickets.length > 0"
      :class="['transition-all duration-500', 'lg:col-span-3']"
    >
      <div
        class="bg-casino-blue-dark rounded-lg shadow-xl p-6 border border-casino-blue-light/30"
      >
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold text-casino-gold-light">
            Simulation
          </h2>
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

        <div
          v-else-if="error"
          class="text-center text-red-400 bg-red-900/50 border border-red-500 p-4 rounded-md"
          role="alert"
        >
          {{ error }}
        </div>

        <div v-else-if="!loading">
          <SingleDrawPanel
            v-if="mode === 'single'"
            :key="singlePanelKey"
            :tickets="tickets"
            :total-price="totalPrice"
            @apply-highlights="applyHighlightsOnTickets"
            @winning-data-updated="updateWinningData"
          />
          <MonteCarloPanel
            v-if="mode === 'montecarlo'"
            :key="montePanelKey"
            :tickets="tickets"
            :cost-per-simulation="totalPrice"
            @apply-highlights="applyHighlightsOnTickets"
            @winning-data-updated="updateWinningData"
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
import type { EurojackpotHistoricOdds } from '~/types/winning'
import SingleDrawPanel from './SingleDrawPanel.vue'
import MonteCarloPanel from './MonteCarloPanel.vue'
import TicketComponent from './TicketItem.vue'
import SummaryCard from './SummaryCard.vue'
import StepperInput from './StepperInput.vue'

interface TicketType {
  label: string
  mainCount: number
  euroCount: number
  price: number
}

const ticketTypes: ReadonlyArray<TicketType> = [
  {
    label: '5 main + 2 Euro numbers (standard)',
    mainCount: 5,
    euroCount: 2,
    price: 2.0,
  },
  { label: '5 main + 3 Euro numbers', mainCount: 5, euroCount: 3, price: 6.0 },
  { label: '5 main + 4 Euro numbers', mainCount: 5, euroCount: 4, price: 12.0 },
  { label: '5 main + 5 Euro numbers', mainCount: 5, euroCount: 5, price: 20.0 },
  { label: '5 main + 6 Euro numbers', mainCount: 5, euroCount: 6, price: 30.0 },
  { label: '5 main + 7 Euro numbers', mainCount: 5, euroCount: 7, price: 42.0 },
  { label: '5 main + 8 Euro numbers', mainCount: 5, euroCount: 8, price: 56.0 },
  { label: '5 main + 9 Euro numbers', mainCount: 5, euroCount: 9, price: 72.0 },
  {
    label: '5 main + 10 Euro numbers',
    mainCount: 5,
    euroCount: 10,
    price: 90.0,
  },
  {
    label: '5 main + 11 Euro numbers',
    mainCount: 5,
    euroCount: 11,
    price: 110.0,
  },
  {
    label: '5 main + 12 Euro numbers',
    mainCount: 5,
    euroCount: 12,
    price: 132.0,
  },
  { label: '6 main + 2 Euro numbers', mainCount: 6, euroCount: 2, price: 12.0 },
  { label: '6 main + 3 Euro numbers', mainCount: 6, euroCount: 3, price: 36.0 },
  { label: '7 main + 2 Euro numbers', mainCount: 7, euroCount: 2, price: 42.0 },
  {
    label: '7 main + 3 Euro numbers',
    mainCount: 7,
    euroCount: 3,
    price: 126.0,
  },
]

const maxTicketsAllowed = 500
const selectedTicketType: Ref<TicketType> = ref(ticketTypes[0])
const ticketCount: Ref<number> = ref(1)
const selectionMethod = ref<'random' | 'weighted'>('weighted')
const tickets: Ref<Ticket[]> = ref([])
const loading: Ref<boolean> = ref(false)
const currentAction: Ref<'generate' | 'simulate' | null> = ref(null)
const error: Ref<string> = ref('')
const latestWinningData: Ref<EurojackpotHistoricOdds | null> = ref(null)

// UI mode
const mode = ref<'single' | 'montecarlo'>('single')
const singlePanelKey = ref(0)
const montePanelKey = ref(0)
const showGenerationForm = ref(false)

const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBase

const totalPrice = computed<number>(() => {
  const count = Math.max(1, ticketCount.value || 1)
  return (selectedTicketType.value?.price ?? 0) * count
})

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
  singlePanelKey.value++
  montePanelKey.value++
}

const resetTickets = (): void => {
  clearTickets()
  showGenerationForm.value = false
}

const extractErrorMessage = (err: unknown): string => {
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    const data = (e.data as Record<string, unknown> | undefined) ?? undefined
    const candidates = [
      data?.message,
      data?.statusMessage,
      e.statusText,
      e.message,
    ]
    for (const c of candidates) {
      if (typeof c === 'string' && c) return c
    }
  }
  return 'Failed to generate tickets.'
}

const generateTicketsHandler = async (): Promise<void> => {
  if (loading.value) return
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
  resetAllState(true)

  try {
    const generatedTickets = await $fetch<Ticket[]>(`${apiBaseUrl}/generate`, {
      method: 'POST',
      body: {
        ticketCount: ticketCount.value,
        mainCount: selectedTicketType.value.mainCount,
        euroCount: selectedTicketType.value.euroCount,
        algorithm:
          selectionMethod.value === 'weighted' ? 'weighted' : 'uniform',
      },
    })
    tickets.value = generatedTickets
    singlePanelKey.value++
    montePanelKey.value++
    showGenerationForm.value = false
  } catch (err: unknown) {
    console.error('Error generating tickets:', err)
    const errorResponseMessage = extractErrorMessage(err)
    error.value = errorResponseMessage
    tickets.value = []
  } finally {
    loading.value = false
    currentAction.value = null
  }
}

const updateWinningData = (data: EurojackpotHistoricOdds): void => {
  latestWinningData.value = data
}

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
</script>

<style scoped>
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type='number'] {
  -moz-appearance: textfield;
}
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
@media (min-width: 1024px) {
  .grid {
    transition: grid-template-columns 500ms ease-in-out;
  }
}
</style>
