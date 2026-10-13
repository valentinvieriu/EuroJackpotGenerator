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
      :autoplay="autoplayOnShow"
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
      <LedMeter
        label="Spins"
        :value="shownMeter.draws"
        format="count"
        :live="simStore.isRunning"
      />
      <LedMeter
        label="Paid in"
        :value="shownMeter.spent"
        :live="simStore.isRunning"
      />
      <LedMeter
        label="Won back"
        :value="shownMeter.won"
        :live="simStore.isRunning"
      />
      <LedMeter
        label="Net"
        :value="net"
        format="signed-euro"
        :live="simStore.isRunning"
        :tone="net < 0 ? 'loss' : net > 0 ? 'gain' : 'neutral'"
      />
    </div>
    <div
      v-if="shownMeter.draws > 0"
      class="mt-2 flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1 text-xs"
    >
      <p class="text-center text-content-muted">{{ keptLine }}</p>
      <button
        type="button"
        class="text-content-secondary underline underline-offset-4 transition-colors duration-150 hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-50"
        title="Walk away: the meters go back to zero, your tickets stay"
        :disabled="busy"
        @click="cashOut"
      >
        Cash out
      </button>
    </div>

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

      <div class="flex flex-wrap items-stretch justify-center gap-3">
        <button
          type="button"
          class="btn-casino-gold font-cta-bold flex min-w-56 items-center justify-center gap-3 rounded-2xl px-8 py-4 text-xl disabled:cursor-wait"
          :disabled="busy"
          @click="spin"
        >
          <span>{{
            busy && !autoplayOnShow
              ? 'Spinning…'
              : hasTickets
                ? 'Spin again'
                : 'Spin'
          }}</span>
          <span
            class="rounded-full bg-surface-primary/15 px-2.5 py-0.5 font-numbers text-base tracking-normal normal-case"
          >
            {{ formatEuro(cost) }}
          </span>
        </button>

        <!-- Autoplay: the same spin, a great many times over -->
        <div v-if="hasTickets" class="autoplay flex min-h-12 items-stretch">
          <button
            v-if="simStore.isRunning"
            type="button"
            class="autoplay__go btn-casino-blue px-5 font-cta text-lg"
            @click="simStore.cancelSimulation()"
          >
            Stop
          </button>
          <button
            v-else
            type="button"
            class="autoplay__go btn-casino-blue px-5 font-cta text-lg disabled:cursor-wait"
            :disabled="busy"
            @click="startAutoplay"
          >
            Autoplay
          </button>
          <select
            v-model.number="autoplayDraws"
            class="autoplay__draws font-numbers text-sm"
            aria-label="Number of draws on autoplay"
            :disabled="busy"
          >
            <option
              v-for="option in SIMULATION_OPTION_VALUES"
              :key="option"
              :value="option"
            >
              ×{{ formatCount(option) }}
            </option>
          </select>
        </div>
      </div>

      <p
        v-if="hasTickets"
        class="max-w-xl text-center text-sm text-balance text-content-muted"
      >
        {{ autoplayHint }}
      </p>
      <p
        v-else
        class="max-w-md text-center text-sm text-balance text-content-muted"
      >
        One spin buys {{ ticketCount }} random
        {{ ticketCount === 1 ? 'ticket' : 'tickets' }} and runs one draw. It
        costs nothing: no real money is involved.
      </p>

      <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <button
          v-if="hasTickets"
          type="button"
          class="text-sm text-brand-gold underline underline-offset-4 transition-colors duration-150 hover:text-brand-gold-light"
          @click="emit('paytable')"
        >
          Paytable
        </button>
        <button
          v-else
          type="button"
          class="text-sm text-brand-gold underline underline-offset-4 transition-colors duration-150 hover:text-brand-gold-light"
          @click="emit('customize')"
        >
          Choose your own tickets
        </button>
        <NuxtLink
          to="/about"
          class="text-sm text-content-secondary underline underline-offset-4 transition-colors duration-150 hover:text-content-primary"
        >
          Why we built this
        </NuxtLink>
      </div>
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
import {
  computed,
  ref,
  watch,
  watchEffect,
  onMounted,
  onBeforeUnmount,
} from 'vue'
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
  SIMULATION_OPTION_VALUES,
  AUTOPLAY_DEFAULT_DRAWS,
  REEL_MIN_SPIN_MS,
} from '~/utils/constants'
import { useMachineSounds } from '~/composables/useMachineSounds'
import { systemPrice } from '~/utils/pricing'
import { formatEuro, formatCount, formatPlayingTime } from '~/utils/format'

const emit = defineEmits<{ customize: []; paytable: [] }>()

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

// Autoplay as the cabinet shows it. A short run is over before the eye
// catches it, so the reels keep turning for at least one spin's length.
const autoplayOnShow = ref(false)
let autoplayStartedAt = 0
let autoplayTimer: ReturnType<typeof setTimeout> | undefined

const busy = computed(
  () =>
    ticketsStore.isGenerating ||
    simStore.isSingleDrawRunning ||
    !drawRevealed.value ||
    autoplayOnShow.value
)

const error = computed(
  () => simStore.state.singleDraw.error || ticketsStore.state.error || ''
)

// The meters only catch up with the store once the reels have stopped. During
// autoplay nothing is hidden, so they count along with the run.
const shownMeter = ref({ ...simStore.meter })
watchEffect(() => {
  if (drawRevealed.value) shownMeter.value = { ...simStore.meter }
})

const net = computed(() => shownMeter.value.won - shownMeter.value.spent)

const keptLine = computed(() => {
  const { spent, won } = shownMeter.value
  if (spent <= 0) return ''
  if (won >= spent) {
    return 'You are ahead for now. Keep spinning and watch what the meter does.'
  }
  const keptShare = Math.round(((spent - won) / spent) * 100)
  return `So far the machine has kept ${keptShare}% of everything you put in.`
})

// --- Autoplay ---

const autoplayDraws = ref<number>(
  simStore.state.config?.simulationCount ?? AUTOPLAY_DEFAULT_DRAWS
)

const autoplayHint = computed(() => {
  const draws = autoplayDraws.value
  const stake = formatEuro(draws * cost.value, { decimals: 0 })
  return `Autoplay ×${formatCount(draws)} stakes ${stake}: ${formatPlayingTime(draws)} of playing every Tuesday and Friday.`
})

const startAutoplay = () => {
  if (busy.value || !hasTickets.value) return
  pullLever()
  void simStore.startSimulation({ simulationCount: autoplayDraws.value })
}

const onAutoplayShown = () => {
  autoplayOnShow.value = false
  // The run gets the same verdict as a single spin: bells that climb with what
  // came back, which for most runs means a short run that never resolves
  const finished = simStore.state.results
  if (simStore.state.phase === 'results' && finished) {
    sounds.result(finished.totalWinnings, finished.totalCost)
  }
}

watch(
  () => simStore.isRunning,
  (running) => {
    clearTimeout(autoplayTimer)
    if (running) {
      autoplayStartedAt = performance.now()
      autoplayOnShow.value = true
      return
    }
    if (!autoplayOnShow.value) return
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    const remaining = reduceMotion
      ? 0
      : Math.max(0, REEL_MIN_SPIN_MS - (performance.now() - autoplayStartedAt))
    autoplayTimer = setTimeout(onAutoplayShown, remaining)
  }
)

const autoplayLine = computed(() => {
  const { phase, progress, results } = simStore.state
  if (autoplayOnShow.value) {
    return progress && progress.currentSimulation > 0
      ? `Autoplay: draw ${formatCount(progress.currentSimulation)} of ${formatCount(progress.totalSimulations)}.`
      : 'Autoplay running…'
  }
  if (phase === 'results' && results) {
    const draws = formatCount(results.totalSimulations)
    const amount = formatEuro(Math.abs(results.netProfit), { decimals: 0 })
    if (results.netProfit < 0) {
      return `${draws} draws later you are ${amount} down. The whole story is below.`
    }
    return results.netProfit > 0
      ? `${draws} draws later you are ${amount} ahead. Run it again and see if that lasts.`
      : `${draws} draws later you are exactly even. Run it again and see if that lasts.`
  }
  if (phase === 'cancelled' && progress) {
    return `Stopped after ${formatCount(progress.currentSimulation)} draws. They still count on the meters.`
  }
  return ''
})

// --- Cash out ---

// What the meters read when the player walked away
const cashedOut = ref<{ draws: number; spent: number; won: number } | null>(
  null
)

const cashOut = () => {
  if (busy.value) return
  cashedOut.value = { ...simStore.meter }
  simStore.cashOut()
  lastEvent.value = 'cashout'
}

const cashOutLine = computed(() => {
  if (!cashedOut.value) return ''
  const { draws, spent, won } = cashedOut.value
  const spins = `${formatCount(draws)} ${draws === 1 ? 'spin' : 'spins'}`
  const amount = formatEuro(Math.abs(won - spent))
  if (won < spent) {
    return `You cashed out ${amount} down after ${spins}. The meters are back at zero.`
  }
  return won > spent
    ? `You cashed out ${amount} ahead after ${spins}. Walking away is the only way to keep it.`
    : `You cashed out even after ${spins}. The meters are back at zero.`
})

// --- Status line ---

// What the machine did last decides what the status line talks about
const lastEvent = ref<'spin' | 'autoplay' | 'cashout' | null>(null)
watch(
  () => simStore.isSingleDrawRunning,
  (running) => {
    if (running) lastEvent.value = 'spin'
  }
)
watch(
  () => simStore.isRunning,
  (running) => {
    if (running) lastEvent.value = 'autoplay'
  }
)
watch(hasTickets, (has) => {
  if (!has) lastEvent.value = null
})

const statusLine = computed(() => {
  if (error.value) return error.value
  if (!drawRevealed.value || spinning.value) return 'Drawing…'

  if (lastEvent.value === 'autoplay' && autoplayLine.value) {
    return autoplayLine.value
  }
  if (lastEvent.value === 'cashout' && cashOutLine.value) {
    return cashOutLine.value
  }

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

const pullLever = () => {
  leverPulled.value = true
  clearTimeout(leverTimer)
  leverTimer = setTimeout(() => (leverPulled.value = false), LEVER_PULL_MS)
}

const spin = async () => {
  if (busy.value) return

  pullLever()

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
  clearTimeout(autoplayTimer)
  sounds.spinEnd()
  // A run has nowhere to report to once the machine is gone
  simStore.cancelSimulation()
  // Never leave results hidden behind a spin that can no longer finish
  setDrawRevealed(true)
})
</script>

<style scoped>
/* One control in two parts: the key that starts the run, and how long it runs */
.autoplay__go {
  border-radius: 1rem 0 0 1rem;
}
.autoplay__draws {
  padding-inline: 0.75rem 0.5rem;
  border: 1px solid oklch(1 0 0 / 0.1);
  border-inline-start: 0;
  border-radius: 0 1rem 1rem 0;
  background-color: var(--color-surface-primary);
  color: var(--color-content-secondary);
  cursor: pointer;
  transition: color var(--duration-150) var(--ease-standard);
}
.autoplay__draws:hover:not(:disabled) {
  color: var(--color-content-primary);
}
.autoplay__draws:focus-visible {
  outline: 2px solid var(--color-brand-gold-300);
  outline-offset: 2px;
}
.autoplay__draws:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
</style>
