<template>
  <div
    :class="[
      'transition-all duration-500 ease-in-out',
      tickets.length > 0
        ? 'space-y-6 lg:space-y-0 lg:grid lg:grid-cols-5 lg:gap-6 lg:items-stretch'
        : 'block',
    ]"
  >
    <!-- Welcome message for shared Lucky Numbers -->
    <div
      v-if="showWelcomeMessage"
      class="col-span-full bg-gradient-to-r from-casino-gold/20 to-casino-gold-light/20 border border-casino-gold/50 rounded-lg p-4 mb-6 relative"
    >
      <div class="flex items-start gap-3">
        <div class="text-2xl">🎯</div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-casino-gold-light mb-1">
            Welcome to Lucky Numbers "{{ welcomeLuckyCode }}"!
          </h3>
          <p class="text-sm text-gray-300">
            Someone shared their ticket configuration with you. The settings
            below have been loaded automatically. Click "Generate Numbers" to
            create the exact same tickets they had!
          </p>
        </div>
        <button
          class="text-gray-400 hover:text-gray-200 transition duration-150 p-1"
          title="Dismiss"
          @click="dismissWelcomeMessage"
        >
          ✕
        </button>
      </div>
    </div>

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
      <!-- Lucky Numbers Sharing Dialog -->
      <div
        v-if="showSharingDialog"
        class="bg-casino-blue-dark rounded-lg shadow-xl p-6 border border-casino-gold/50"
      >
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-lg font-semibold text-casino-gold-light mb-1">
              🎉 Lucky Numbers Created!
            </h3>
            <p class="text-sm text-gray-400">
              Your configuration has been saved as "{{ currentLuckyCode }}"
            </p>
          </div>
          <button
            class="text-gray-400 hover:text-gray-200 transition duration-150"
            title="Close"
            @click="closeSharingDialog"
          >
            ✕
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-2">
              Shareable link:
            </label>
            <div class="flex gap-2">
              <input
                :value="shareableUrl"
                readonly
                class="flex-1 px-3 py-2 bg-casino-blue border border-casino-blue-light/50 rounded-md text-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-casino-gold"
              />
              <button
                :class="[
                  'px-4 py-2 text-sm font-medium rounded-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-casino-gold',
                  copySuccess
                    ? 'bg-green-600 text-white'
                    : 'bg-casino-gold text-casino-blue-dark hover:bg-casino-gold-light',
                ]"
                @click="copyToClipboard"
              >
                {{ copySuccess ? '✓ Copied!' : 'Copy Link' }}
              </button>
            </div>
          </div>

          <div class="text-xs text-gray-500 bg-casino-blue/40 p-3 rounded-md">
            <strong>💡 How it works:</strong> Anyone with this link can recreate
            your exact ticket configuration and numbers. The lucky code "{{
              currentLuckyCode
            }}" ensures the same results every time.
          </div>
        </div>
      </div>

      <!-- Generated Tickets Section (moved to left column) -->
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
                class="px-2 py-1 text-sm text-casino-gold hover:text-casino-gold-light underline transition duration-150 focus:outline-none focus:ring-2 focus:ring-casino-gold rounded"
                title="Create shareable link for these numbers"
                @click="shareLuckyNumbers"
              >
                Share
              </button>
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
import { ref, computed, onMounted, watch, type Ref } from 'vue'
import { useRuntimeConfig } from '#app'
import type { Ticket } from '~/types/ticket'
import type { EurojackpotHistoricOdds } from '~/types/winning'
import { systemPrice } from '~/utils/pricing'
import SingleDrawPanel from './SingleDrawPanel.vue'
import MonteCarloPanel from './MonteCarloPanel.vue'
import TicketComponent from './TicketItem.vue'
import StepperInput from './StepperInput.vue'
import {
  generateLuckyCode,
  formatTicketType,
  copyConfigUrl,
  decodeHashToConfig,
  decodeUrlHash,
  parseTicketType,
  seedToLuckyCode,
  updateBrowserUrl,
  getAppConfigUrl,
  type AppConfig,
  type AppState,
} from '~/utils/urlHash'

interface TicketType {
  label: string
  mainCount: number
  euroCount: number
  price: number
}

// System presets - prices computed dynamically using systemPrice utility
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

const maxTicketsAllowed = 500
const selectedTicketType: Ref<TicketType> = ref(ticketTypes.value[0])
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

// App state management
const appState = ref<AppState>('FRESH')
const currentLucky = ref<string>('')

// Debounced URL persistence - prevent history spam from rapid form changes
let urlUpdateTimer: number | undefined
watch(
  [selectedTicketType, ticketCount, selectionMethod],
  () => {
    // Debounce URL updates to avoid spamming browser history on rapid changes
    clearTimeout(urlUpdateTimer)
    urlUpdateTimer = setTimeout(syncUrlWithState, 250)
  },
  { deep: true }
)

const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBase

const totalPrice = computed<number>(() => {
  const count = Math.max(1, ticketCount.value || 1)
  return (selectedTicketType.value?.price ?? 0) * count
})

// Sharing functionality
const showSharingDialog = ref(false)
const currentLuckyCode = ref('')
const shareableUrl = ref('')
const copySuccess = ref(false)
const showWelcomeMessage = ref(false)
const welcomeLuckyCode = ref('')

// Configuration management helpers
const getCurrentConfig = (): AppConfig => {
  const system = formatTicketType(
    selectedTicketType.value.mainCount,
    selectedTicketType.value.euroCount
  )
  const config: AppConfig = {
    system,
    tickets: ticketCount.value,
    method: selectionMethod.value,
  }

  // Add lucky seed if we have one
  if (currentLucky.value) {
    config.lucky = currentLucky.value
  }

  return config
}

const syncUrlWithState = (): void => {
  const config = getCurrentConfig()
  updateBrowserUrl(config)
}

const transitionToFresh = (): void => {
  appState.value = 'FRESH'
  currentLucky.value = ''
  showWelcomeMessage.value = false
  updateBrowserUrl(null) // Clear URL completely for fresh state
}

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
  transitionToFresh()
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
    const requestBody: {
      ticketCount: number
      mainCount: number
      euroCount: number
      algorithm: 'uniform' | 'weighted'
      seed?: string
    } = {
      ticketCount: ticketCount.value,
      mainCount: selectedTicketType.value.mainCount,
      euroCount: selectedTicketType.value.euroCount,
      algorithm: selectionMethod.value === 'weighted' ? 'weighted' : 'uniform',
    }

    // Add seed if we have one (for reproducible generation)
    if (currentLucky.value) {
      requestBody.seed = currentLucky.value
    }

    const generatedTickets = await $fetch<Ticket[]>(`${apiBaseUrl}/generate`, {
      method: 'POST',
      body: requestBody,
    })

    tickets.value = generatedTickets
    singlePanelKey.value++
    montePanelKey.value++
    showGenerationForm.value = false

    // Update URL after successful generation (immediate persistence)
    syncUrlWithState()
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

// Lucky Numbers sharing functions
const shareLuckyNumbers = async (): Promise<void> => {
  try {
    let luckyCode: string

    if (appState.value === 'SHARED' && currentLucky.value) {
      // Re-share the original shared configuration
      luckyCode = currentLucky.value
    } else {
      // Create new lucky code for current configuration
      luckyCode = generateLuckyCode()
    }

    currentLuckyCode.value = luckyCode

    // Create the app configuration with lucky seed
    const config: AppConfig = {
      system: formatTicketType(
        selectedTicketType.value.mainCount,
        selectedTicketType.value.euroCount
      ),
      tickets: ticketCount.value,
      method: selectionMethod.value,
      lucky: luckyCode,
    }

    // Generate the shareable URL
    shareableUrl.value = getAppConfigUrl(config)

    // Show the sharing dialog
    showSharingDialog.value = true
  } catch (error) {
    console.error('Failed to create shareable configuration:', error)
    error.value = 'Failed to create shareable link'
  }
}

const copyToClipboard = async (): Promise<void> => {
  try {
    const config: AppConfig = {
      system: formatTicketType(
        selectedTicketType.value.mainCount,
        selectedTicketType.value.euroCount
      ),
      tickets: ticketCount.value,
      method: selectionMethod.value,
      lucky: currentLuckyCode.value,
    }

    await copyConfigUrl(config)
    copySuccess.value = true

    // Hide success message after 2 seconds
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy URL:', error)
  }
}

const closeSharingDialog = (): void => {
  showSharingDialog.value = false
  copySuccess.value = false
}

// URL handling for configuration restoration
const handleUrlConfiguration = async (): Promise<void> => {
  if (typeof window === 'undefined') return

  const hash = window.location.hash
  if (!hash) {
    // No hash = fresh state
    appState.value = 'FRESH'
    return
  }

  // Try to decode as new unified format
  const config = decodeUrlHash(hash)
  if (config) {
    await applyUrlConfig(config)
    return
  }

  // Try to decode as legacy format for backwards compatibility
  const legacyConfig = decodeHashToConfig(hash)
  if (legacyConfig && (legacyConfig.seed || legacyConfig.ticketType)) {
    // Convert legacy format to new format
    const luckyCode = legacyConfig.seed
      ? seedToLuckyCode(legacyConfig.seed)
      : generateLuckyCode()

    const newConfig: Partial<AppConfig> = {
      system: legacyConfig.ticketType,
      tickets: legacyConfig.ticketCount,
      method: legacyConfig.selectionMethod,
      lucky: luckyCode,
    }

    await applyUrlConfig(newConfig)
    return
  }

  // Couldn't decode hash - treat as fresh
  appState.value = 'FRESH'
}

const applyUrlConfig = async (config: Partial<AppConfig>): Promise<void> => {
  // Apply configuration to form
  if (config.system) {
    const parsed = parseTicketType(config.system)
    if (parsed) {
      const matchingType = ticketTypes.value.find(
        (t) =>
          t.mainCount === parsed.mainCount && t.euroCount === parsed.euroCount
      )
      if (matchingType) {
        selectedTicketType.value = matchingType
      }
    }
  }

  if (
    config.tickets &&
    config.tickets >= 1 &&
    config.tickets <= maxTicketsAllowed
  ) {
    ticketCount.value = config.tickets
  }

  if (config.method) {
    selectionMethod.value = config.method
  }

  // Handle lucky seed if present (shared configuration)
  if (config.lucky) {
    appState.value = 'SHARED'
    currentLucky.value = config.lucky
    welcomeLuckyCode.value = config.lucky
    showWelcomeMessage.value = true

    // Auto-dismiss welcome message after 12 seconds
    setTimeout(() => {
      showWelcomeMessage.value = false
    }, 12000)

    // Automatically generate the tickets using the lucky code as seed
    try {
      loading.value = true
      currentAction.value = 'generate'
      error.value = ''

      const generatedTickets = await $fetch<Ticket[]>(
        `${apiBaseUrl}/generate`,
        {
          method: 'POST',
          body: {
            ticketCount: ticketCount.value,
            mainCount: selectedTicketType.value.mainCount,
            euroCount: selectedTicketType.value.euroCount,
            algorithm: 'uniform', // Use uniform for seeded generation
            seed: config.lucky, // Use the lucky code as the seed
          },
        }
      )

      tickets.value = generatedTickets
      singlePanelKey.value++
      montePanelKey.value++
      showGenerationForm.value = false
    } catch (err: unknown) {
      console.error('Error generating shared tickets:', err)
      error.value =
        'Failed to generate the shared numbers. You can try generating manually.'
    } finally {
      loading.value = false
      currentAction.value = null
    }
  } else {
    // No lucky seed - just restore form state
    appState.value = 'FRESH'
    currentLucky.value = ''
  }
}

const dismissWelcomeMessage = (): void => {
  showWelcomeMessage.value = false
  // If user dismisses welcome from shared state, remove the lucky seed
  if (appState.value === 'SHARED') {
    currentLucky.value = ''
    syncUrlWithState()
  }
}

// Load configuration from URL on mount
onMounted(() => {
  handleUrlConfiguration()
})
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
