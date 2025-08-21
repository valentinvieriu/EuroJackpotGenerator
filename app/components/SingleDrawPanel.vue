<template>
  <div>
    <div
      v-if="error"
      class="mb-4 rounded-md border border-error bg-error-dark/50 p-3 text-center text-error"
    >
      {{ error }}
    </div>

    <div v-if="simulationResult || loading" class="mb-6">
      <SimulatedExtraction :result="simulationResult" :loading="loading" />
    </div>

    <div
      v-if="simulationResult || loading"
      class="casino-card mb-4 grid min-h-[100px] grid-cols-1 gap-4 rounded-lg p-4 sm:grid-cols-2"
    >
      <div class="text-center">
        <div class="text-sm text-content-muted">Total Winnings</div>
        <div
          v-if="loading && !simulationResult"
          class="text-xl font-semibold text-brand-gold"
        >
          <div
            class="mx-auto h-7 w-20 animate-pulse rounded bg-surface-secondary"
          ></div>
        </div>
        <div v-else class="text-xl font-semibold text-brand-gold">
          €{{ totalWinnings.toFixed(2) }}
        </div>
      </div>
      <div class="text-center">
        <div class="text-sm text-content-muted">Profit / Loss</div>
        <div
          v-if="loading && !simulationResult"
          class="text-xl font-semibold text-premium-emerald-400"
        >
          <div
            class="mx-auto h-7 w-24 animate-pulse rounded bg-surface-secondary"
          ></div>
        </div>
        <div
          v-else
          :class="[
            'text-xl font-semibold',
            winLossRate >= 0 ? 'text-premium-emerald-400' : 'text-error',
          ]"
        >
          {{ winLossRate >= 0 ? '+' : '' }}€{{
            profitLossAmount.toFixed(2)
          }}
          ({{ winLossRate.toFixed(1) }}%)
        </div>
      </div>
    </div>

    <!-- Description and Action Button -->
    <form
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      @submit.prevent="simulateExtractionHandler"
    >
      <p class="text-sm text-content-muted">
        Simulate a single draw to see immediate winning results and ROI
      </p>
      <button
        :disabled="loading || tickets.length === 0"
        type="submit"
        :class="[
          'btn-casino-gold focus-gold rounded-md px-5 py-2 font-cta',
          'transition-transform duration-300 ease-out',
          'hover:scale-105 active:scale-100',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100',
          loading ? 'cursor-wait' : '',
        ]"
      >
        <Transition name="button-content" mode="out-in">
          <span v-if="!loading" key="default" class="flex items-center gap-2">
            <span class="text-2xl">🎲</span>
            <span class="hidden sm:inline">Run Single Draw Simulation</span>
            <span class="sm:hidden">Run Single Draw</span>
          </span>
          <span v-else key="loading" class="flex items-center gap-2">
            <svg
              class="h-4 w-4 animate-spin"
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
            <span>Simulating...</span>
          </span>
        </Transition>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, type PropType } from 'vue'
import type { Ticket } from '~/schemas'
import SimulatedExtraction from './SimulatedExtraction.vue'

const props = defineProps({
  tickets: { type: Array as PropType<Ticket[]>, required: true },
})

// No emits; parent reads odds via store

// Use simulation store for state management
const simStore = useSimulationStore()
const ticketsStore = useTicketsStore()

// Computed getters based on store state
const loading = computed(() => simStore.isSingleDrawRunning)
const error = computed(() => simStore.state.singleDraw.error || '')
const simulationResult = computed(() => {
  const winningNumbers = simStore.state.singleDraw.winningNumbers
  if (!winningNumbers) return null

  // Convert readonly arrays to mutable arrays for component compatibility
  return {
    mainNumbers: [...winningNumbers.mainNumbers] as number[],
    euroNumbers: [...winningNumbers.euroNumbers] as number[],
  }
})
const totalWinnings = computed(
  () => simStore.state.singleDraw.results?.totalWinnings || 0
)
const winLossRate = computed(
  () => simStore.state.singleDraw.results?.roiPercentage || 0
)
const totalPrice = computed(() => ticketsStore.totalPrice)
const profitLossAmount = computed(() => totalWinnings.value - totalPrice.value)

// The reset function is no longer needed since the store manages state

const simulateExtractionHandler = async (): Promise<void> => {
  if (!props.tickets.length || loading.value) return

  // Use store action to run single draw
  await simStore.runSingleDraw(totalPrice.value)

  // Highlights and odds are derived reactively via stores
}

// Trigger simulation on Enter key when Single Draw panel is active
const onEnterKey = (e: KeyboardEvent): void => {
  if (e.key !== 'Enter') return
  const target = e.target as HTMLElement | null
  const tag = target?.tagName?.toLowerCase()
  const isFormElement =
    !!tag &&
    (tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      tag === 'button')
  const isEditable = !!(target && (target as HTMLElement).isContentEditable)
  if (isFormElement || isEditable) return
  if (!loading.value && props.tickets.length > 0) {
    e.preventDefault()
    void simulateExtractionHandler()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onEnterKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onEnterKey)
})
</script>

<style scoped>
/* Simple button content transitions */
.button-content-enter-active,
.button-content-leave-active {
  transition: all 0.25s ease;
}

.button-content-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.button-content-leave-to {
  opacity: 0;
  transform: translateY(-10px);
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
