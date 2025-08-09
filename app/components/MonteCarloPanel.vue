<template>
  <div class="mt-6">
    <div
      v-if="error"
      class="text-center text-red-400 bg-red-900/50 border border-red-500 p-3 rounded-md mb-4"
    >
      {{ error }}
    </div>

    <BatchSimulationConfig
      v-if="tickets.length > 0 && state.phase === 'config'"
      :ticket-count="tickets.length"
      :cost-per-simulation="costPerSimulation"
      :disabled="state.isRunning"
      :can-cancel="state.canCancel"
      :show-cancel-button="state.isRunning"
      @start="handleStart"
      @cancel="handleCancel"
    />

    <BatchSimulationProgress
      v-if="state.phase === 'running'"
      :current-simulation="state.currentSimulation"
      :total-simulations="state.totalSimulations"
      :elapsed-time="state.elapsedTime"
      :estimated-time-remaining="state.estimatedTimeRemaining"
      :can-cancel="state.canCancel"
      :partial-results="state.partialResults"
      @cancel="handleCancel"
    />

    <BatchSimulationResults
      v-if="state.phase === 'results' && state.results"
      :results="state.results"
      @reset="handleReset"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, type PropType } from 'vue'
import { useRuntimeConfig } from '#app'
import type { Ticket } from '~/types/ticket'
import type {
  BatchSimulationRequest,
  BatchSimulationResult,
} from '~/types/batchSimulation'
import BatchSimulationConfig from './BatchSimulationConfig.vue'
import BatchSimulationProgress from './BatchSimulationProgress.vue'
import BatchSimulationResults from './BatchSimulationResults.vue'
import { playWinSound } from '~/utils/audioUtils'

const props = defineProps({
  tickets: { type: Array as PropType<Ticket[]>, required: true },
  costPerSimulation: { type: Number, required: true },
})

const error = ref('')
const state = ref({
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

const timer = ref<NodeJS.Timeout | null>(null)
const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBase

const formatEstimatedTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

const handleStart = async (cfg: BatchSimulationRequest): Promise<void> => {
  if (!props.tickets.length) return
  error.value = ''
  state.value = {
    phase: 'running',
    isRunning: true,
    canCancel: true,
    currentSimulation: 0,
    totalSimulations: cfg.simulationCount,
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

  timer.value = setInterval(() => {
    state.value.elapsedTime = Date.now() - state.value.startTime
    if (state.value.currentSimulation > 0) {
      const avg = state.value.elapsedTime / state.value.currentSimulation
      const remaining =
        state.value.totalSimulations - state.value.currentSimulation
      state.value.estimatedTimeRemaining = formatEstimatedTime(remaining * avg)
    }
  }, 1000)

  try {
    const request: BatchSimulationRequest = { ...cfg, tickets: props.tickets }
    const resp = await fetch(`${apiBaseUrl}/batchSimulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson',
      },
      body: JSON.stringify(request),
      signal: state.value.abortController?.signal ?? undefined,
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
              msg = JSON.parse(line)
            } catch {
              console.warn('Failed to parse NDJSON line', line)
              continue
            }
            const isObj = (v: unknown): v is Record<string, unknown> =>
              typeof v === 'object' && v !== null
            if (
              isObj(msg) &&
              msg.type === 'progress' &&
              isObj(msg.progress) &&
              isObj(msg.summary)
            ) {
              const current = Number(msg.progress?.currentSimulation) || 0
              state.value.currentSimulation = current
              state.value.partialResults = {
                simulationsCompleted: current,
                totalWins:
                  isObj(msg.summary.winDistribution) &&
                  typeof msg.summary.winDistribution.totalWins === 'number'
                    ? msg.summary.winDistribution.totalWins
                    : 0,
                winPercentage:
                  isObj(msg.summary.winDistribution) &&
                  typeof msg.summary.winDistribution.winPercentage === 'number'
                    ? msg.summary.winDistribution.winPercentage
                    : 0,
                currentROI:
                  typeof msg.summary.roiPercentage === 'number'
                    ? msg.summary.roiPercentage
                    : 0,
                netProfit:
                  typeof msg.summary.netProfit === 'number'
                    ? msg.summary.netProfit
                    : 0,
                maxWin:
                  typeof msg.summary.maxWin === 'number'
                    ? msg.summary.maxWin
                    : 0,
                winsByClass:
                  isObj(msg.summary.winDistribution) &&
                  typeof msg.summary.winDistribution.winsByClass === 'object' &&
                  msg.summary.winDistribution.winsByClass !== null
                    ? (msg.summary.winDistribution.winsByClass as Record<
                        number,
                        number
                      >)
                    : {},
              }
            } else if (
              isObj(msg) &&
              msg.type === 'result' &&
              isObj(msg.result)
            ) {
              state.value.results =
                msg.result as unknown as BatchSimulationResult
              state.value.phase = 'results'
            } else if (
              isObj(msg) &&
              msg.type === 'error' &&
              typeof msg.error === 'string'
            ) {
              throw new Error(String(msg.error))
            }
          }
        }
      }
      await consume()
    } else {
      state.value.results = (await resp.json()) as BatchSimulationResult
      state.value.phase = 'results'
    }
    if (state.value.results && state.value.results.roiPercentage > 0) {
      const r = state.value.results
      playWinSound(r.totalWinnings, r.totalCost)
    }
  } catch (err: unknown) {
    console.error('Batch simulation error:', err)
    if (err instanceof DOMException && err.name === 'AbortError') {
      error.value = 'Batch simulation was cancelled.'
    } else if (typeof err === 'object' && err !== null) {
      const anyErr = err as Record<string, unknown>
      const msg =
        (anyErr.data as Record<string, unknown> | undefined)?.message ||
        (anyErr.message as string | undefined) ||
        'An error occurred during batch simulation.'
      error.value = String(msg)
    } else {
      error.value = 'An error occurred during batch simulation.'
    }
    state.value.phase = 'config'
  } finally {
    state.value.isRunning = false
    state.value.canCancel = false
    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
    }
  }
}

const handleCancel = (): void => {
  if (state.value.abortController) state.value.abortController.abort()
  state.value.canCancel = false
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
}

const handleReset = (): void => {
  state.value = {
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
}

onUnmounted(() => {
  if (state.value.abortController) state.value.abortController.abort()
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
})
</script>

<style scoped></style>
