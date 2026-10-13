<template>
  <section
    class="cabinet relative mx-auto max-w-3xl px-3 pt-5 pb-6 sm:px-8 sm:pt-6 sm:pb-8"
    aria-labelledby="machine-title"
  >
    <div class="bulbs mx-3 mb-4" aria-hidden="true" />

    <button
      type="button"
      class="absolute top-9 right-4 rounded-full p-2 text-content-muted transition-colors duration-150 hover:text-content-secondary sm:right-6"
      :aria-pressed="audioEnabled"
      :title="audioEnabled ? 'Mute the machine' : 'Unmute the machine'"
      @click="toggleAudio"
    >
      <span class="sr-only">Sound</span>
      <svg
        class="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        <template v-if="audioEnabled">
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </template>
        <template v-else>
          <path d="m22 9-6 6" />
          <path d="m16 9 6 6" />
        </template>
      </svg>
    </button>

    <header class="mb-5 px-8 text-center">
      <h1 id="machine-title" class="text-hero text-2xl sm:text-4xl">
        EuroJackpot Simulator
      </h1>
      <p class="label-plate mt-2">The machine that makes you lose</p>
    </header>

    <SlotReels
      :main-numbers="winningNumbers?.mainNumbers ?? null"
      :euro-numbers="winningNumbers?.euroNumbers ?? null"
      :spinning="spinning"
      @spin="onSpinStart"
      @reel-stop="sounds.reelStop"
      @settled="onSettled"
    />

    <p
      :class="[
        'mt-4 min-h-12 text-center text-sm text-balance sm:min-h-6 sm:text-base',
        error ? 'text-error-light' : 'text-content-secondary',
      ]"
      aria-live="polite"
    >
      {{ statusLine }}
    </p>

    <div class="led-panel mt-4">
      <LedMeter label="Spins" :value="shownSession.draws" format="count" />
      <LedMeter label="Paid in" :value="shownSession.spent" />
      <LedMeter label="Won back" :value="shownSession.won" />
      <LedMeter
        label="Net"
        :value="net"
        format="signed-euro"
        :tone="net < 0 ? 'loss' : net > 0 ? 'gain' : 'neutral'"
      />
    </div>
    <p
      v-if="shownSession.draws > 0"
      class="mt-2 text-center text-xs text-content-muted"
    >
      {{ keptLine }}
    </p>

    <div class="mt-6 flex flex-col items-center gap-4">
      <div v-if="!hasTickets" class="flex items-center gap-3">
        <span class="label-plate">Tickets per spin</span>
        <StepperInput
          v-model="ticketCount"
          :min="1"
          :max="SIMPLE_MODE_TICKET_COUNT_MAX"
          label="Tickets per spin"
        />
      </div>

      <button
        type="button"
        class="btn-casino-gold font-cta-bold flex min-w-56 items-center justify-center gap-3 rounded-2xl px-8 py-4 text-xl disabled:cursor-wait"
        :disabled="busy"
        @click="spin"
      >
        <span>{{
          busy ? 'Spinning…' : hasTickets ? 'Spin again' : 'Spin'
        }}</span>
        <span
          class="rounded-full bg-surface-primary/15 px-2.5 py-0.5 font-numbers text-base tracking-normal normal-case"
        >
          {{ formatEuro(cost) }}
        </span>
      </button>

      <template v-if="!hasTickets">
        <p class="max-w-md text-center text-sm text-balance text-content-muted">
          One spin buys {{ ticketCount }} random
          {{ ticketCount === 1 ? 'ticket' : 'tickets' }} and runs one draw. It
          costs nothing: no real money is involved.
        </p>
        <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <button
            type="button"
            class="text-sm text-brand-gold underline underline-offset-4 transition-colors duration-150 hover:text-brand-gold-light"
            @click="emit('customize')"
          >
            Pick your own numbers
          </button>
          <NuxtLink
            to="/about"
            class="text-sm text-content-secondary underline underline-offset-4 transition-colors duration-150 hover:text-content-primary"
          >
            Why we built this
          </NuxtLink>
        </div>
      </template>
    </div>

    <!-- Decorative lever: pulls on every spin, and works as a second spin button for mouse users -->
    <button
      type="button"
      tabindex="-1"
      aria-hidden="true"
      :class="['lever hidden lg:block', { 'lever--pulled': leverPulled }]"
      :disabled="busy"
      @click="spin"
    >
      <span class="lever__mount" />
      <span class="lever__slot" />
      <span class="lever__arm" />
      <span class="lever__knob" />
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import SlotReels from './SlotReels.vue'
import LedMeter from './LedMeter.vue'
import StepperInput from './StepperInput.vue'
import {
  useAudioState,
  useSimulationPanelState,
} from '~/composables/useAppState'
import {
  SIMPLE_MODE_SYSTEM_MAIN,
  SIMPLE_MODE_SYSTEM_EURO,
  SIMPLE_MODE_TICKET_COUNT_MAX,
} from '~/utils/constants'
import { useMachineSounds } from '~/composables/useMachineSounds'
import { systemPrice } from '~/utils/pricing'
import { formatEuro } from '~/utils/format'

const emit = defineEmits<{ customize: [] }>()

const LEVER_PULL_MS = 600

const ticketsStore = useTicketsStore()
const simStore = useSimulationStore()
const { audioEnabled, toggleAudio } = useAudioState()
const { drawRevealed, setDrawRevealed } = useSimulationPanelState()
const sounds = useMachineSounds()

const hasTickets = computed(() => ticketsStore.hasTickets)
const winningNumbers = computed(() => simStore.state.singleDraw.winningNumbers)

const ticketCount = computed({
  get: () => ticketsStore.state.config.ticketCount,
  set: (value) => ticketsStore.updateConfig({ ticketCount: value }),
})

// Before the first spin the machine sells standard tickets; afterwards it
// charges for whatever tickets are on the table.
const cost = computed(() =>
  hasTickets.value
    ? ticketsStore.stakePerDraw
    : systemPrice(SIMPLE_MODE_SYSTEM_MAIN, SIMPLE_MODE_SYSTEM_EURO) *
      ticketCount.value
)

// Reels spin for a draw, and for the ticket purchase that leads straight into one
const spinning = computed(
  () =>
    simStore.isSingleDrawRunning ||
    (ticketsStore.isGenerating && ticketsStore.state.autoSimulate)
)
const busy = computed(
  () =>
    ticketsStore.isGenerating ||
    simStore.isSingleDrawRunning ||
    !drawRevealed.value
)

const error = computed(
  () => simStore.state.singleDraw.error || ticketsStore.state.error || ''
)

// The meters only catch up with the store once the reels have stopped
const shownSession = ref({ ...simStore.session })
watchEffect(() => {
  if (drawRevealed.value) shownSession.value = { ...simStore.session }
})

const net = computed(() => shownSession.value.won - shownSession.value.spent)

const keptLine = computed(() => {
  const { spent, won } = shownSession.value
  if (spent <= 0) return ''
  if (won >= spent) {
    return 'You are ahead for now. Keep spinning and watch what the meter does.'
  }
  const keptShare = Math.round(((spent - won) / spent) * 100)
  return `So far the machine has kept ${keptShare}% of everything you put in.`
})

const statusLine = computed(() => {
  if (error.value) return error.value
  if (!drawRevealed.value || spinning.value) return 'Drawing…'

  const results = simStore.singleDrawResults
  if (!results) {
    return hasTickets.value
      ? 'Your tickets are loaded. Spin to run a draw.'
      : 'Choose how many tickets to buy, then spin.'
  }

  // Tickets were swapped or removed after the draw: the result on show is that
  // draw re-scored, not what the spin itself cost
  if (spinStake.value !== null && results.stake !== spinStake.value) {
    return results.totalWinnings > 0
      ? `Against that draw, the tickets now on the table win ${formatEuro(results.totalWinnings)} on a ${formatEuro(results.stake)} stake.`
      : 'Against that draw, the tickets now on the table win nothing.'
  }

  if (results.totalWinnings <= 0) {
    return `No win. That spin cost you ${formatEuro(results.stake)}.`
  }
  if (results.netProfit < 0) {
    return `You won ${formatEuro(results.totalWinnings)} and still lost ${formatEuro(-results.netProfit)} on this spin.`
  }
  return `You won ${formatEuro(results.totalWinnings)} on a ${formatEuro(results.stake)} stake. Enjoy it: this rarely happens.`
})

// What the last spin actually cost, to tell it apart from a later re-score
const spinStake = ref<number | null>(null)

// Results stay hidden, and silent, until the last reel is down
const onSpinStart = () => {
  setDrawRevealed(false)
  sounds.spinStart()
}

const onSettled = (landed: boolean) => {
  sounds.spinEnd()
  setDrawRevealed(true)
  const results = simStore.singleDrawResults
  if (landed && results) {
    spinStake.value = results.stake
    sounds.result(results.totalWinnings, results.stake)
  }
}

const leverPulled = ref(false)
let leverTimer: ReturnType<typeof setTimeout> | undefined

const spin = async () => {
  if (busy.value) return

  leverPulled.value = true
  clearTimeout(leverTimer)
  leverTimer = setTimeout(() => (leverPulled.value = false), LEVER_PULL_MS)

  if (hasTickets.value) {
    await simStore.runSingleDraw()
  } else {
    await ticketsStore.generateSimpleTickets()
  }
}

// Enter spins from anywhere on the page, unless the user is working a control
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.defaultPrevented) return
  const target = event.target as HTMLElement | null
  if (
    document.querySelector('[role="dialog"]') ||
    target?.isContentEditable ||
    target?.closest('input, textarea, select, button, a, [role="dialog"]')
  ) {
    return
  }
  event.preventDefault()
  void spin()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(leverTimer)
  sounds.spinEnd()
  // Never leave results hidden behind a spin that can no longer finish
  setDrawRevealed(true)
})
</script>
