<template>
  <div>
    <h3 class="text-lg font-semibold text-content-primary">Autoplay</h3>
    <p class="mt-1 text-sm text-content-muted">
      One spin proves nothing. Let the machine play these same tickets draw
      after draw and watch where the money goes.
    </p>

    <fieldset class="mt-5">
      <legend class="label-plate mb-2">Number of draws</legend>
      <div class="flex flex-wrap gap-2">
        <label
          v-for="option in SIMULATION_OPTION_VALUES"
          :key="option"
          class="cursor-pointer"
        >
          <input
            v-model.number="simulationCount"
            type="radio"
            name="autoplay-draws"
            class="peer sr-only"
            :value="option"
            :disabled="disabled"
          />
          <span
            class="block rounded-full border border-border-secondary bg-surface-primary/60 px-3.5 py-1.5 font-numbers text-sm text-content-secondary transition-colors duration-150 peer-checked:border-brand-gold/60 peer-checked:bg-brand-gold/15 peer-checked:text-brand-gold-light peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-gold-300 peer-disabled:opacity-50"
          >
            ×{{ formatCount(option) }}
          </span>
        </label>
      </div>
    </fieldset>

    <dl class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div class="well stat-tile">
        <dt class="label-plate mb-1">It would cost</dt>
        <dd class="stat-tile__value">{{ formatEuro(totalCost) }}</dd>
        <dd class="mt-0.5 text-xs text-content-muted">
          {{ formatCount(simulationCount) }} draws ×
          {{ formatEuro(costPerDraw) }}
        </dd>
      </div>
      <div class="well stat-tile">
        <dt class="label-plate mb-1">It would take</dt>
        <dd class="stat-tile__value">{{ playingTime }}</dd>
        <dd class="mt-0.5 text-xs text-content-muted">
          playing every Tuesday and Friday draw
        </dd>
      </div>
      <div class="well stat-tile sm:col-span-2">
        <dt class="label-plate mb-1">You can count on</dt>
        <dd class="stat-tile__value">
          about {{ formatCents(reach.returnWithinReach) }} back per €1
        </dd>
        <dd class="mt-0.5 text-xs text-content-muted">
          By its rules the game pays back
          {{ formatCents(LONG_RUN_RETURN) }} per €1 on average.
          <template v-if="reach.outOfReach.length > 0">
            The other {{ formatCents(reach.returnOutOfReach) }} is paid through
            the rarest prizes, mostly the jackpot.
          </template>
        </dd>
      </div>
    </dl>

    <div class="mt-6 flex justify-end">
      <button
        type="button"
        class="btn-casino-gold rounded-xl px-6 py-2.5 font-cta disabled:cursor-not-allowed"
        :disabled="disabled"
        @click="start"
      >
        Start autoplay
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  SIMULATION_OPTION_VALUES,
  LARGE_SIMULATION_THRESHOLD,
} from '~/utils/constants'
import { PRICE_PER_LINE } from '~/utils/pricing'
import { splitReturnByReach, LONG_RUN_RETURN } from '~/utils/prizeTable'
import {
  formatEuro,
  formatCents,
  formatCount,
  formatPlayingTime,
} from '~/utils/format'

interface Props {
  /** Stake for one draw across all tickets */
  costPerDraw: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), { disabled: false })

const emit = defineEmits<{
  start: [config: { simulationCount: number }]
}>()

const simulationCount = ref<number>(LARGE_SIMULATION_THRESHOLD)

const totalCost = computed(() => simulationCount.value * props.costPerDraw)
const playingTime = computed(() => formatPlayingTime(simulationCount.value))

// What a run of this many lines can realistically collect of the long-run payback
const reach = computed(() =>
  splitReturnByReach(Math.round(totalCost.value / PRICE_PER_LINE))
)

const start = () => {
  emit('start', { simulationCount: simulationCount.value })
}
</script>
