<template>
  <div>
    <!-- Control Panel Section -->
    <div
      class="bg-casino-blue-dark rounded-lg shadow-xl p-6 mb-8 border border-casino-blue-light/30"
    >
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

      <!-- Results Summary Section (Shown after simulation) -->
      <div
        v-if="simulationResult"
        class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 items-end"
      >
        <!-- Total Winnings Display -->
        <div class="text-right sm:text-left">
          <label class="mb-2 block text-gray-400 text-sm font-medium"
            >Total Winnings:</label
          >
          <div class="flex items-center justify-end sm:justify-start h-10">
            <span class="text-xl font-semibold text-casino-gold"
              >€{{ totalWinnings.toFixed(2) }}</span
            >
          </div>
        </div>
        <!-- Win/Loss Rate Display -->
        <div class="text-right sm:text-left">
          <label class="mb-2 block text-gray-400 text-sm font-medium"
            >Profit / Loss:</label
          >
          <div class="flex items-center justify-end sm:justify-start h-10">
            <span
              :class="[
                'text-xl font-semibold',
                winLossRate >= 0 ? 'text-green-400' : 'text-red-400',
              ]"
            >
              {{ winLossRate >= 0 ? '+' : ''
              }}{{ profitLossAmount.toFixed(2) }}€ ({{
                winLossRate.toFixed(1)
              }}%)
              <!-- Show percentage -->
            </span>
          </div>
        </div>
        <!-- Empty div for alignment or future use -->
        <div />
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row justify-end gap-3 mt-4">
        <button
          :disabled="loading"
          class="bg-casino-gold text-casino-blue-dark px-5 py-2 rounded-md font-semibold hover:bg-casino-gold-light focus:outline-none focus:ring-2 focus:ring-casino-gold focus:ring-offset-2 focus:ring-offset-casino-blue-dark disabled:opacity-50 disabled:cursor-wait transition duration-150"
          @click="generateTicketsHandler"
        >
          {{
            loading && currentAction === 'generate'
              ? 'Generating...'
              : 'Generate Tickets'
          }}
        </button>
        <button
          :disabled="loading || tickets.length === 0"
          class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2 rounded-md font-semibold hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-casino-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
          @click="simulateExtractionHandler"
        >
          {{
            loading && currentAction === 'simulate'
              ? 'Simulating...'
              : 'Simulate Extraction'
          }}
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
      class="text-center text-red-400 bg-red-900/50 border border-red-500 p-4 rounded-md my-6"
      role="alert"
    >
      {{ error }}
    </div>

    <!-- Simulation Result Display -->
    <SimulationResult v-if="simulationResult" :result="simulationResult" />

    <!-- Batch Simulation Section -->
    <BatchSimulationConfig
      v-if="
        tickets.length > 0 &&
        !simulationResult &&
        batchSimulationState.phase === 'config'
      "
      :ticket-count="tickets.length"
      :cost-per-simulation="totalPrice"
      :disabled="batchSimulationState.isRunning"
      :can-cancel="batchSimulationState.canCancel"
      :show-cancel-button="batchSimulationState.isRunning"
      @start="handleBatchSimulationStart"
      @cancel="handleBatchSimulationCancel"
    />

    <!-- Batch Simulation Progress -->
    <BatchSimulationProgress
      v-if="batchSimulationState.phase === 'running'"
      :current-simulation="batchSimulationState.currentSimulation"
      :total-simulations="batchSimulationState.totalSimulations"
      :elapsed-time="batchSimulationState.elapsedTime"
      :estimated-time-remaining="batchSimulationState.estimatedTimeRemaining"
      :can-cancel="batchSimulationState.canCancel"
      :partial-results="batchSimulationState.partialResults"
      @cancel="handleBatchSimulationCancel"
    />

    <!-- Batch Simulation Results -->
    <BatchSimulationResults
      v-if="
        batchSimulationState.phase === 'results' && batchSimulationState.results
      "
      :results="batchSimulationState.results"
      @reset="handleBatchSimulationReset"
    />

    <!-- Ticket List Display -->
    <div
      v-if="
        tickets.length && !loading && batchSimulationState.phase !== 'results'
      "
      class="space-y-4"
    >
      <h2
        v-if="!simulationResult"
        class="text-2xl font-semibold text-gray-300 mb-4"
      >
        Generated Tickets ({{ tickets.length }})
      </h2>
      <h2 v-else class="text-2xl font-semibold text-gray-300 mb-4">
        Simulation Results ({{ tickets.length }} Tickets)
      </h2>
      <!-- Use TicketComponent which is renamed from Ticket to avoid naming conflict -->
      <TicketComponent
        v-for="ticket in tickets"
        :key="ticket.id"
        :ticket="ticket"
        :ticket-number="ticket.id"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, type Ref } from 'vue'
import { useRuntimeConfig } from '#app' // Nuxt composable for runtime config
import type { Ticket } from '~/types/ticket'
import type { EurojackpotHistoricOdds } from '~/types/winning'
import SimulationResult from './SimulationResult.vue'
import TicketComponent from './TicketItem.vue' // Renamed import
import BatchSimulationConfig from './BatchSimulationConfig.vue'
import BatchSimulationProgress from './BatchSimulationProgress.vue'
import BatchSimulationResults from './BatchSimulationResults.vue'
import { calculateTotalWinnings } from '~/utils/winningManager'
import { calculateWinningLineCounts } from '~/utils/combinatorics'
import { playWinSound } from '~/utils/audioUtils' // Sound utility
import type {
  BatchSimulationRequest,
  BatchSimulationResult,
} from '~/types/batchSimulation'

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
// Stores the result of the simulated winning draw (main and euro numbers). Null if not simulated yet.
const simulationResult: Ref<Pick<
  Ticket,
  'mainNumbers' | 'euroNumbers'
> | null> = ref(null)
// Stores the fetched official winning odds data for calculating payouts.
const latestWinningData: Ref<EurojackpotHistoricOdds | null> = ref(null)
// Calculated total winnings from all tickets after simulation.
const totalWinnings: Ref<number> = ref(0)
// Calculated win/loss rate percentage ((Profit / Cost) * 100). Null before simulation.
const winLossRate: Ref<number> = ref(0) // Initialize to 0

// --- Batch Simulation State ---
const batchSimulationState = ref({
  phase: 'config' as 'config' | 'running' | 'results',
  isRunning: false,
  canCancel: false,
  currentSimulation: 0,
  totalSimulations: 0,
  startTime: 0,
  elapsedTime: 0,
  estimatedTimeRemaining: null as string | null,
  partialResults: null as {
    simulationsCompleted: number
    totalWins: number
    winPercentage: number
    currentROI: number
    netProfit: number
    maxWin: number
    winsByClass: Record<number, number>
  } | null,
  results: null as BatchSimulationResult | null,
  abortController: null as AbortController | null,
})

// Timer for updating elapsed time during batch simulation
const batchTimer = ref<NodeJS.Timeout | null>(null)

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

// Calculates the absolute profit or loss amount.
const profitLossAmount = computed<number>(
  () => totalWinnings.value - totalPrice.value
)

// --- Methods ---

/**
 * Resets the component state related to simulation results and errors.
 * Called before starting a new generation or simulation.
 */
const resetState = (clearTickets: boolean = false): void => {
  if (clearTickets) {
    tickets.value = []
  }
  error.value = ''
  simulationResult.value = null
  latestWinningData.value = null
  totalWinnings.value = 0
  winLossRate.value = 0 // Reset rate to 0
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
  resetState(true) // Clear previous tickets and results

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

/**
 * Handles the 'Simulate Extraction' button click.
 * Fetches a simulated winning draw and the latest official odds data concurrently.
 * Then, checks tickets against the simulation and calculates winnings.
 */
const simulateExtractionHandler = async (): Promise<void> => {
  // Prevent simulation if no tickets generated or already loading
  if (tickets.value.length === 0) {
    error.value = 'Please generate tickets before simulating.'
    return
  }
  if (loading.value) return

  loading.value = true
  currentAction.value = 'simulate'
  // Reset previous simulation results but keep generated tickets
  resetState(false)

  try {
    // --- Step 1: Fetch Simulation and Winning Data Concurrently ---
    // Use Promise.all to fetch both pieces of data in parallel for efficiency.
    const [simResponse, winDataResponse] = await Promise.all([
      // Fetch the simulated winning numbers (5 main, 2 euro)
      $fetch<Pick<Ticket, 'mainNumbers' | 'euroNumbers'>>(
        `${apiBaseUrl}/simulate`
      ),
      // Fetch the latest official winning odds data (includes fallback logic in API)
      $fetch<EurojackpotHistoricOdds>(`${apiBaseUrl}/fetchWinningData`),
    ])

    // --- Step 2: Process Responses ---
    simulationResult.value = simResponse
    latestWinningData.value = winDataResponse // API handles normalization and fallback

    // Basic validation of fetched data
    if (
      !simulationResult.value?.mainNumbers ||
      !simulationResult.value?.euroNumbers
    ) {
      throw new Error('Invalid simulation result received from API.')
    }
    if (!latestWinningData.value?.eurojackpotOdds) {
      // Log warning but proceed; winnings calculation will handle missing odds.
      console.warn('Winning odds data is missing or invalid in the response.')
    }

    // --- Step 3: Check Tickets Against Simulation ---
    checkWinningNumbers() // Updates each ticket with winClass and highlights matches

    // --- Step 4: Calculate Total Winnings ---
    // Only calculate if valid odds data is available.
    if (
      latestWinningData.value?.eurojackpotOdds &&
      latestWinningData.value.eurojackpotOdds.length > 0
    ) {
      totalWinnings.value = calculateTotalWinnings(
        tickets.value,
        latestWinningData.value
      )
    } else {
      totalWinnings.value = 0 // Set winnings to 0 if odds are missing/invalid
      console.warn(
        'Cannot calculate total winnings because odds data is unavailable or empty.'
      )
    }

    // --- Step 5: Calculate Win/Loss Rate ---
    const cost = totalPrice.value // Get the calculated total cost
    if (cost > 0) {
      const profit = totalWinnings.value - cost
      // Calculate rate as percentage. Avoid division by zero.
      winLossRate.value = (profit / cost) * 100
    } else {
      // Handle edge case where cost is zero (e.g., 0 tickets selected - though UI prevents this)
      // If winnings > 0, rate is effectively infinite positive. If winnings=0, rate is 0.
      winLossRate.value = totalWinnings.value > 0 ? Infinity : 0
    }
  } catch (err: unknown) {
    // Handle errors from either fetch call or processing steps
    console.error('Error during simulation or data processing:', err)
    const errorResponseMessage =
      err.data?.message ||
      err.data?.statusMessage ||
      err.statusText ||
      err.message ||
      'An error occurred during simulation.'
    error.value = String(errorResponseMessage)
    // Clear results on error to avoid showing inconsistent state
    resetState(false)
  } finally {
    loading.value = false
    currentAction.value = null

    // --- Step 6: Play Sound Based on Result ---
    // Play sound only if simulation completed (simulationResult is not null).
    if (simulationResult.value) {
      playWinSound(totalWinnings.value, totalPrice.value)
    }
  }
}

/**
 * Compares each generated ticket against the simulated winning numbers.
 * For system tickets, uses efficient combinatorial math to calculate per-class win counts.
 * Formula: C(k,i) × C(m−k,5−i) × C(h,j) × C(e−h,2−j)
 * Updates each ticket object with:
 * - `winningMainNumbers`: Array of matched main numbers for UI highlighting.
 * - `winningEuroNumbers`: Array of matched euro numbers for UI highlighting.
 * - `winClassCounts`: Record of winning class counts for system tickets.
 * - `winClass`: The best (lowest number) winning class if any.
 * Finally, sorts the tickets array to show winners first, ordered by winning class.
 */
const checkWinningNumbers = (): void => {
  if (!simulationResult.value || tickets.value.length === 0) {
    console.warn(
      'Cannot check winning numbers: Simulation result or tickets are missing.'
    )
    return
  }

  const simMain = simulationResult.value.mainNumbers
  const simEuro = simulationResult.value.euroNumbers

  tickets.value.forEach((ticket) => {
    // Highlight intersections for the UI bubbles
    ticket.winningMainNumbers = ticket.mainNumbers.filter((n) =>
      simMain.includes(n)
    )
    ticket.winningEuroNumbers = ticket.euroNumbers.filter((n) =>
      simEuro.includes(n)
    )

    // Calculate k (correct mains) and h (correct euros)
    const k = ticket.winningMainNumbers.length
    const h = ticket.winningEuroNumbers.length
    const m = ticket.mainNumbers.length
    const e = ticket.euroNumbers.length

    // Use efficient combinatorial calculation instead of line expansion
    const winCounts = calculateWinningLineCounts(m, e, k, h)

    ticket.winClassCounts = winCounts
    ticket.winClass = Object.keys(winCounts)
      .map(Number)
      .sort((a, b) => a - b)[0] // Best class if any
  })

  // Sort winners first (best class), then by id
  tickets.value.sort((a, b) => {
    const A = a.winClass ?? 999
    const B = b.winClass ?? 999
    return A === B ? a.id - b.id : A - B
  })
}

// --- Batch Simulation Methods ---

/**
 * Handles the start of batch simulation.
 */
const handleBatchSimulationStart = async (
  config: BatchSimulationRequest
): Promise<void> => {
  if (tickets.value.length === 0) {
    error.value = 'Please generate tickets before starting batch simulation.'
    return
  }

  // Reset batch simulation state
  batchSimulationState.value = {
    phase: 'running',
    isRunning: true,
    canCancel: true,
    currentSimulation: 0,
    totalSimulations: config.simulationCount,
    startTime: Date.now(),
    elapsedTime: 0,
    estimatedTimeRemaining: null,
    partialResults: {
      simulationsCompleted: 0,
      totalWins: 0,
      winPercentage: 0,
      currentROI: 0,
      netProfit: 0,
      maxWin: 0,
      winsByClass: {},
    },
    results: null,
    abortController: new AbortController(),
  }

  // Start timer for elapsed time updates
  batchTimer.value = setInterval(() => {
    batchSimulationState.value.elapsedTime =
      Date.now() - batchSimulationState.value.startTime

    // Calculate estimated time remaining
    if (batchSimulationState.value.currentSimulation > 0) {
      const avgTimePerSim =
        batchSimulationState.value.elapsedTime /
        batchSimulationState.value.currentSimulation
      const remainingSims =
        batchSimulationState.value.totalSimulations -
        batchSimulationState.value.currentSimulation
      const estimatedMs = remainingSims * avgTimePerSim

      batchSimulationState.value.estimatedTimeRemaining =
        formatEstimatedTime(estimatedMs)
    }
  }, 1000)

  try {
    // Prepare request with tickets
    const request: BatchSimulationRequest = {
      ...config,
      tickets: tickets.value,
    }

    // Make streaming API call (NDJSON)
    const resp = await fetch(`${apiBaseUrl}/batchSimulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson',
      },
      body: JSON.stringify(request),
      signal: batchSimulationState.value.abortController?.signal ?? undefined,
    })

    const contentType = resp.headers.get('content-type') || ''

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(text || `HTTP ${resp.status}`)
    }

    if (contentType.includes('application/x-ndjson') && resp.body) {
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const consume = async (): Promise<void> => {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let idx: number
          while ((idx = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, idx).trim()
            buffer = buffer.slice(idx + 1)
            if (!line) continue
            let msg: unknown
            try {
              msg = JSON.parse(line) as unknown
            } catch {
              console.warn('Failed to parse NDJSON line', line)
              continue
            }

            type StreamProgress = {
              type: 'progress'
              progress: {
                currentSimulation: number
                totalSimulations: number
                progressPercentage: number
              }
              summary: {
                totalCost: number
                totalWinnings: number
                netProfit: number
                roiPercentage: number
                maxWin: number
                winDistribution: {
                  winsByClass: Record<number, number>
                  totalWins: number
                  totalLosses: number
                  winPercentage: number
                }
              }
            }
            type StreamResult = {
              type: 'result'
              result: BatchSimulationResult
            }
            type StreamError = { type: 'error'; error: string }

            const isProgress = (m: unknown): m is StreamProgress => {
              if (typeof m !== 'object' || m === null) return false
              const g = m as Record<string, unknown>
              if (g.type !== 'progress') return false
              const progress = g.progress as Record<string, unknown> | undefined
              const summary = g.summary as Record<string, unknown> | undefined
              return (
                typeof progress?.currentSimulation === 'number' &&
                typeof summary?.netProfit === 'number'
              )
            }
            const isResult = (m: unknown): m is StreamResult => {
              if (typeof m !== 'object' || m === null) return false
              const g = m as Record<string, unknown>
              return (
                g.type === 'result' &&
                typeof g.result === 'object' &&
                g.result !== null
              )
            }
            const isError = (m: unknown): m is StreamError => {
              if (typeof m !== 'object' || m === null) return false
              const g = m as Record<string, unknown>
              return g.type === 'error' && typeof g.error === 'string'
            }

            if (isProgress(msg)) {
              const current = Number(msg.progress.currentSimulation) || 0
              batchSimulationState.value.currentSimulation = current
              batchSimulationState.value.partialResults = {
                simulationsCompleted: current,
                totalWins: msg.summary.winDistribution.totalWins ?? 0,
                winPercentage: msg.summary.winDistribution.winPercentage ?? 0,
                currentROI: msg.summary.roiPercentage ?? 0,
                netProfit: msg.summary.netProfit ?? 0,
                maxWin: msg.summary.maxWin ?? 0,
                winsByClass: msg.summary.winDistribution.winsByClass || {},
              }
            } else if (isResult(msg)) {
              batchSimulationState.value.results = msg.result
              batchSimulationState.value.phase = 'results'
            } else if (isError(msg)) {
              throw new Error(String(msg.error))
            }
          }
        }
      }

      await consume()
    } else {
      // Fallback: non-streaming JSON response
      const results = (await resp.json()) as BatchSimulationResult
      batchSimulationState.value.results = results
      batchSimulationState.value.phase = 'results'
    }

    // Play sound based on overall performance
    if (
      batchSimulationState.value.results &&
      batchSimulationState.value.results.roiPercentage > 0
    ) {
      const r = batchSimulationState.value.results
      playWinSound(r.totalWinnings, r.totalCost)
    }
  } catch (err: unknown) {
    console.error('Error during batch simulation:', err)

    if (err instanceof DOMException && err.name === 'AbortError') {
      error.value = 'Batch simulation was cancelled.'
    } else {
      const errorMessage =
        err.data?.message ||
        err.data?.statusMessage ||
        err.statusText ||
        err.message ||
        'An error occurred during batch simulation.'
      error.value = String(errorMessage)
    }

    // Reset to config phase on error
    batchSimulationState.value.phase = 'config'
  } finally {
    batchSimulationState.value.isRunning = false
    batchSimulationState.value.canCancel = false

    // Clear timer
    if (batchTimer.value) {
      clearInterval(batchTimer.value)
      batchTimer.value = null
    }
  }
}

/**
 * Handles cancellation of batch simulation.
 */
const handleBatchSimulationCancel = (): void => {
  if (batchSimulationState.value.abortController) {
    batchSimulationState.value.abortController.abort()
  }

  batchSimulationState.value.canCancel = false

  // Clear timer
  if (batchTimer.value) {
    clearInterval(batchTimer.value)
    batchTimer.value = null
  }
}

/**
 * Handles reset of batch simulation to start a new one.
 */
const handleBatchSimulationReset = (): void => {
  batchSimulationState.value = {
    phase: 'config',
    isRunning: false,
    canCancel: false,
    currentSimulation: 0,
    totalSimulations: 0,
    startTime: 0,
    elapsedTime: 0,
    estimatedTimeRemaining: null,
    partialResults: null,
    results: null,
    abortController: null,
  }

  // Also reset single simulation state
  resetState(false)
}

/**
 * Formats estimated time remaining in a human-readable format.
 */
const formatEstimatedTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

// --- Lifecycle ---

/**
 * Cleanup when component is unmounted
 */
onUnmounted(() => {
  // Cancel any running batch simulation
  if (batchSimulationState.value.abortController) {
    batchSimulationState.value.abortController.abort()
  }

  // Clear timer
  if (batchTimer.value) {
    clearInterval(batchTimer.value)
    batchTimer.value = null
  }
})
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
</style>
