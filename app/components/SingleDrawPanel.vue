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
import { computed, ref, onMounted, onBeforeUnmount, type PropType } from 'vue'
import { useRuntimeConfig } from '#app'
import type {
  Ticket,
  EurojackpotHistoricOdds,
  SimulateResponse,
} from '~/schemas'
import SimulatedExtraction from './SimulatedExtraction.vue'
import { buildOddsMap } from '~/utils/payout'
import { buildTicketHighlightUpdates } from '~/utils/ticketHighlighting'
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
  (e: 'winning-data-updated', data: EurojackpotHistoricOdds): void
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
      $fetch<SimulateResponse>(`${apiBaseUrl}/simulate`),
      $fetch<EurojackpotHistoricOdds>(`${apiBaseUrl}/fetchWinningData`),
    ])

    // Adapt to new API: { draw: { mainNumbers, euroNumbers }, meta: {...} }
    simulationResult.value = simResponse.draw
    latestWinningData.value = winDataResponse
    emit('winning-data-updated', winDataResponse)

    if (
      !simulationResult.value?.mainNumbers ||
      !simulationResult.value?.euroNumbers
    ) {
      throw new Error('Invalid simulation result received from API.')
    }

    const simMain = simulationResult.value.mainNumbers
    const simEuro = simulationResult.value.euroNumbers

    const updates = buildTicketHighlightUpdates(props.tickets, simMain, simEuro)

    emit('apply-highlights', updates)

    if (latestWinningData.value?.eurojackpotOdds?.length) {
      const oddsMap = buildOddsMap(latestWinningData.value)
      let sum = 0
      for (const u of updates) {
        for (const [clsStr, count] of Object.entries(u.winClassCounts)) {
          const amount = oddsMap.get(Number(clsStr)) ?? 0
          sum += amount * (count as number)
        }
      }
      totalWinnings.value = Number(sum.toFixed(2))
    } else {
      totalWinnings.value = 0
    }

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
