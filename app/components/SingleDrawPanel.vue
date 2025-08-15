<template>
  <div>
    <div
      v-if="error"
      class="text-center text-red-400 bg-red-900/50 border border-red-500 p-3 rounded-md mb-4"
    >
      {{ error }}
    </div>

    <div v-if="simulationResult" class="mb-6">
      <SimulatedExtraction :result="simulationResult" />
    </div>

    <div
      v-if="simulationResult"
      class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 p-4 bg-casino-blue/50 rounded-lg border border-casino-blue-light/20"
    >
      <div class="text-center">
        <div class="text-sm text-gray-400">Total Winnings</div>
        <div class="text-xl font-semibold text-casino-gold">
          €{{ totalWinnings.toFixed(2) }}
        </div>
      </div>
      <div class="text-center">
        <div class="text-sm text-gray-400">Profit / Loss</div>
        <div
          :class="[
            'text-xl font-semibold',
            winLossRate >= 0 ? 'text-green-400' : 'text-red-400',
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
      class="flex justify-between items-center"
      @submit.prevent="simulateExtractionHandler"
    >
      <p class="text-gray-400 text-sm">
        Simulate a single draw to see immediate winning results and ROI
      </p>
      <button
        :disabled="loading || tickets.length === 0"
        type="submit"
        class="bg-gradient-to-r from-vip-orange to-vip-orange-light text-white px-5 py-2 rounded-md font-semibold hover:from-vip-orange-light hover:to-[#FF7A4D] focus:outline-none focus:ring-2 focus:ring-vip-orange focus:ring-offset-2 focus:ring-offset-casino-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
      >
        {{ loading ? 'Simulating...' : 'Run Single Draw Simulation' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, type PropType } from 'vue'
import type { Ticket, EurojackpotHistoricOdds } from '~/schemas'
import SimulatedExtraction from './SimulatedExtraction.vue'

const props = defineProps({
  tickets: { type: Array as PropType<Ticket[]>, required: true },
  totalPrice: { type: Number, required: true },
})

const emit = defineEmits<{
  (
    e: 'apply-highlights',
    updates: Array<{
      id: number
      winningMainNumbers: number[]
      winningEuroNumbers: number[]
      winClassCounts: Record<number, number>
      winClass?: number
    }>
  ): void
  (e: 'winning-data-updated', data: EurojackpotHistoricOdds): void
}>()

// Use simulation store for state management
const simStore = useSimulationStore()

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
const _latestWinningData = computed(() => simStore.state.singleDraw.oddsData)
const totalWinnings = computed(
  () => simStore.state.singleDraw.results?.totalWinnings || 0
)
const winLossRate = computed(
  () => simStore.state.singleDraw.results?.roiPercentage || 0
)
const profitLossAmount = computed(() => totalWinnings.value - props.totalPrice)

// The reset function is no longer needed since the store manages state

const simulateExtractionHandler = async (): Promise<void> => {
  if (!props.tickets.length || loading.value) return

  // Use store action to run single draw
  await simStore.runSingleDraw(props.totalPrice)

  // Emit winning data and highlights to parent if we have results
  if (simStore.state.singleDraw.oddsData) {
    emit(
      'winning-data-updated',
      simStore.state.singleDraw.oddsData as EurojackpotHistoricOdds
    )
  }

  if (simStore.state.singleDraw.results?.ticketHighlights) {
    emit(
      'apply-highlights',
      simStore.state.singleDraw.results.ticketHighlights as Array<{
        id: number
        winningMainNumbers: number[]
        winningEuroNumbers: number[]
        winClassCounts: Record<number, number>
        winClass?: number
      }>
    )
  }
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

<style scoped></style>
