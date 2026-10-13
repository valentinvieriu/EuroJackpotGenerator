<template>
  <div
    class="reel-window"
    :style="{
      '--reel-stagger': `${REEL_STAGGER_MS}ms`,
      '--reel-land': `${REEL_LAND_MS}ms`,
    }"
    role="group"
    :aria-label="summary"
  >
    <template v-for="(reel, i) in reels" :key="reel.key">
      <span
        v-if="i === MAIN_NUMBERS_COUNT"
        class="reel-divider"
        aria-hidden="true"
      >
        +
      </span>
      <div class="reel" :style="{ '--reel-i': i }">
        <div
          v-if="autoplay || phase === 'spinning' || phase === 'landing'"
          :class="[
            'reel-strip',
            { 'reel-strip--stopping': phase === 'landing' },
          ]"
          aria-hidden="true"
        >
          <!-- The sequence is rendered twice so the spin loops without a seam -->
          <LottoBall
            v-for="(n, j) in [...reel.filler, ...reel.filler]"
            :key="j"
            :number="n"
            :type="reel.type"
          />
        </div>

        <template v-if="!autoplay">
          <LottoBall
            v-if="
              (phase === 'landing' || phase === 'shown') && reel.number !== null
            "
            :number="reel.number"
            :type="reel.type"
            hit
            :class="{ 'reel-ball--landing': phase === 'landing' }"
          />
          <span
            v-else-if="phase === 'idle'"
            class="lotto-ball lotto-ball--socket"
            aria-hidden="true"
          >
            <span class="lotto-ball__num">?</span>
          </span>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import LottoBall from './LottoBall.vue'
import {
  MAIN_NUMBERS_COUNT,
  EURO_NUMBERS_COUNT,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MAX,
  REEL_MIN_SPIN_MS,
  REEL_STAGGER_MS,
  REEL_LAND_MS,
  REEL_SETTLE_GRACE_MS,
  REEL_STOP_SOUND_AT,
} from '~/utils/constants'

interface Props {
  mainNumbers: readonly number[] | null
  euroNumbers: readonly number[] | null
  /** True while a draw is being fetched */
  spinning: boolean
  /** True while autoplay runs: draws go by too fast to land, so the reels just turn */
  autoplay?: boolean
}

const props = withDefaults(defineProps<Props>(), { autoplay: false })

const emit = defineEmits<{
  /** The reels started spinning: hide anything that would spoil the result */
  spin: []
  /** One reel has come to rest (zero-based index, total reel count) */
  reelStop: [reelIndex: number, reelCount: number]
  /** The reels are still again; `landed` is false when the spin was abandoned */
  settled: [landed: boolean]
}>()

type Phase = 'idle' | 'spinning' | 'landing' | 'shown'
type Draw = { main: number[]; euro: number[] }

const FILLER_LENGTH = 6
const REEL_COUNT = MAIN_NUMBERS_COUNT + EURO_NUMBERS_COUNT

const toDraw = (): Draw | null =>
  props.mainNumbers && props.euroNumbers
    ? { main: [...props.mainNumbers], euro: [...props.euroNumbers] }
    : null

// What the reels currently show; trails the props while a spin plays out
const shown = ref<Draw | null>(toDraw())
const phase = ref<Phase>(shown.value ? 'shown' : 'idle')

let spinStartedAt = 0
// A result has arrived and its landing is scheduled. Vue may deliver the new
// numbers before or after `spinning` turns false, so neither watcher may assume
// an order.
let landingPending = false
let timers: ReturnType<typeof setTimeout>[] = []

const clearTimers = () => {
  timers.forEach(clearTimeout)
  timers = []
  landingPending = false
}
const later = (fn: () => void, ms: number) => {
  timers.push(setTimeout(fn, ms))
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const settle = (landed = false) => {
  phase.value = shown.value ? 'shown' : 'idle'
  emit('settled', landed)
}

watch(
  () => props.spinning,
  (spinning) => {
    if (spinning) {
      clearTimers()
      if (phase.value !== 'spinning') {
        spinStartedAt = performance.now()
        phase.value = 'spinning'
        emit('spin')
      }
    } else if (phase.value === 'spinning' && !landingPending) {
      // No result yet: either another request follows immediately or the draw
      // failed. Give it a moment before falling back to what was shown before.
      later(() => settle(), REEL_SETTLE_GRACE_MS)
    }
  }
)

watch(
  () => [props.mainNumbers, props.euroNumbers] as const,
  () => {
    const draw = toDraw()
    if (!draw) {
      // Cleared while idle (tickets were reset); a clear during a spin just
      // means the next result is on its way.
      if (!props.spinning && phase.value !== 'spinning') {
        clearTimers()
        shown.value = null
        phase.value = 'idle'
      }
      return
    }

    clearTimers()
    landingPending = true
    const reduceMotion = prefersReducedMotion()
    const wasSpinning = phase.value === 'spinning'
    const remainingSpin =
      wasSpinning && !reduceMotion
        ? Math.max(0, REEL_MIN_SPIN_MS - (performance.now() - spinStartedAt))
        : 0

    later(() => {
      landingPending = false
      shown.value = draw
      if (!wasSpinning || reduceMotion) {
        settle(wasSpinning)
        return
      }
      phase.value = 'landing'
      for (let reel = 0; reel < REEL_COUNT; reel++) {
        later(
          () => emit('reelStop', reel, REEL_COUNT),
          reel * REEL_STAGGER_MS + REEL_LAND_MS * REEL_STOP_SOUND_AT
        )
      }
      later(
        () => settle(true),
        (REEL_COUNT - 1) * REEL_STAGGER_MS + REEL_LAND_MS
      )
    }, remainingSpin)
  }
)

onBeforeUnmount(clearTimers)

// Fixed pseudo-random filler per reel: looks shuffled, renders identically everywhere
const filler = (reelIndex: number, max: number) =>
  Array.from(
    { length: FILLER_LENGTH },
    (_, j) => ((reelIndex * 17 + j * 11 + 3) % max) + 1
  )

const reels = computed(() =>
  Array.from({ length: REEL_COUNT }, (_, i) => {
    const isEuro = i >= MAIN_NUMBERS_COUNT
    const number = isEuro
      ? shown.value?.euro[i - MAIN_NUMBERS_COUNT]
      : shown.value?.main[i]
    return {
      key: `reel-${i}`,
      type: isEuro ? ('euro' as const) : ('main' as const),
      number: number ?? null,
      filler: filler(i, isEuro ? EURO_NUMBER_MAX : MAIN_NUMBER_MAX),
    }
  })
)

const summary = computed(() => {
  if (props.autoplay) return 'Autoplay running'
  if (phase.value === 'spinning' || phase.value === 'landing') {
    return 'Drawing numbers'
  }
  if (!shown.value) return 'No draw yet'
  return `Drawn numbers: ${shown.value.main.join(', ')}; Euro numbers: ${shown.value.euro.join(', ')}`
})
</script>
