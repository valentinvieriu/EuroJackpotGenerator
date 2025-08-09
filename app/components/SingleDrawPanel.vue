<template>
  <div class="mt-6">
    <!-- Error -->
    <div
      v-if="error"
      class="text-center text-red-400 bg-red-900/50 border border-red-500 p-3 rounded-md mb-4"
    >
      {{ error }}
    </div>

    <!-- Summary (after simulation) -->
    <div
      v-if="simulationResult"
      class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 items-end"
    >
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
            {{ winLossRate >= 0 ? '+' : '' }}{{ profitLossAmount.toFixed(2) }}€
            ({{ winLossRate.toFixed(1) }}%)
          </span>
        </div>
      </div>
      <div />
    </div>

    <!-- Action -->
    <div class="flex justify-end mb-4">
      <button
        :disabled="loading || tickets.length === 0"
        class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2 rounded-md font-semibold hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-casino-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
        @click="simulateExtractionHandler"
      >
        {{ loading ? 'Simulating...' : 'Run Single Draw' }}
      </button>
    </div>

    <!-- Result numbers -->
    <SimulationResult v-if="simulationResult" :result="simulationResult" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type PropType } from 'vue'
import { useRuntimeConfig } from '#app'
import type { Ticket } from '~/types/ticket'
import type { EurojackpotHistoricOdds } from '~/types/winning'
import SimulationResult from './SimulationResult.vue'
import { calculateTotalWinnings } from '~/utils/winningManager'
import { calculateWinningLineCounts } from '~/utils/combinatorics'
import { playWinSound } from '~/utils/audioUtils'

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
}>()

const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBase

const loading = ref(false)
const error = ref('')
const simulationResult = ref<Pick<
  Ticket,
  'mainNumbers' | 'euroNumbers'
> | null>(null)
const latestWinningData = ref<EurojackpotHistoricOdds | null>(null)
const totalWinnings = ref(0)
const winLossRate = ref(0)

const profitLossAmount = computed(() => totalWinnings.value - props.totalPrice)

const reset = (): void => {
  error.value = ''
  simulationResult.value = null
  latestWinningData.value = null
  totalWinnings.value = 0
  winLossRate.value = 0
}

const simulateExtractionHandler = async (): Promise<void> => {
  if (!props.tickets.length || loading.value) return
  loading.value = true
  reset()
  try {
    const [simResponse, winDataResponse] = await Promise.all([
      $fetch<Pick<Ticket, 'mainNumbers' | 'euroNumbers'>>(
        `${apiBaseUrl}/simulate`
      ),
      $fetch<EurojackpotHistoricOdds>(`${apiBaseUrl}/fetchWinningData`),
    ])
    simulationResult.value = simResponse
    latestWinningData.value = winDataResponse
    if (
      !simulationResult.value?.mainNumbers ||
      !simulationResult.value?.euroNumbers
    ) {
      throw new Error('Invalid simulation result received from API.')
    }

    // Compute highlights and class counts per ticket
    const simMain = simulationResult.value.mainNumbers
    const simEuro = simulationResult.value.euroNumbers
    const updates = props.tickets.map((ticket) => {
      const winningMainNumbers = ticket.mainNumbers.filter((n) =>
        simMain.includes(n)
      )
      const winningEuroNumbers = ticket.euroNumbers.filter((n) =>
        simEuro.includes(n)
      )
      const k = winningMainNumbers.length
      const h = winningEuroNumbers.length
      const m = ticket.mainNumbers.length
      const e = ticket.euroNumbers.length
      const winClassCounts = calculateWinningLineCounts(m, e, k, h)
      const winClass = Object.keys(winClassCounts)
        .map(Number)
        .sort((a, b) => a - b)[0]
      return {
        id: ticket.id,
        winningMainNumbers,
        winningEuroNumbers,
        winClassCounts,
        winClass,
      }
    })
    emit('apply-highlights', updates)

    // Total winnings
    if (latestWinningData.value?.eurojackpotOdds?.length) {
      totalWinnings.value = calculateTotalWinnings(
        props.tickets,
        latestWinningData.value
      )
    } else {
      totalWinnings.value = 0
    }

    // Rate
    const cost = props.totalPrice
    if (cost > 0) {
      const profit = totalWinnings.value - cost
      winLossRate.value = (profit / cost) * 100
    } else {
      winLossRate.value = totalWinnings.value > 0 ? Infinity : 0
    }

    playWinSound(totalWinnings.value, props.totalPrice)
  } catch (err: unknown) {
    console.error('Single-draw error:', err)
    if (typeof err === 'object' && err !== null) {
      const anyErr = err as Record<string, unknown>
      const msg =
        (anyErr.data as Record<string, unknown> | undefined)?.message ||
        (anyErr.message as string | undefined) ||
        'An error occurred during simulation.'
      error.value = String(msg)
    } else {
      error.value = 'An error occurred during simulation.'
    }
    reset()
  } finally {
    loading.value = false
  }
}
</script>

<style scoped></style>
