<template>
  <div class="led">
    <div class="label-plate mb-1">{{ label }}</div>
    <output
      :class="[
        'led__value',
        {
          'led__value--loss': tone === 'loss',
          'led__value--gain': tone === 'gain',
        },
      ]"
    >
      {{ text }}
    </output>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import {
  LED_TWEEN_MS,
  LED_WHOLE_EURO_FROM,
  LED_COMPACT_FROM,
} from '~/utils/constants'
import { formatEuro, formatEuroCompact, formatCount } from '~/utils/format'

interface Props {
  label: string
  value: number
  format?: 'euro' | 'signed-euro' | 'count'
  tone?: 'neutral' | 'loss' | 'gain'
  /** The value is streaming in: show each update as it arrives, without rolling to it */
  live?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  format: 'euro',
  tone: 'neutral',
  live: false,
})

// The displayed number rolls towards the real one, like a mechanical counter
const displayed = ref(props.value)
let frame = 0

const stop = () => {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
}

watch(
  () => props.value,
  (to) => {
    stop()
    const from = displayed.value
    const reduceMotion =
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (props.live || reduceMotion || from === to) {
      displayed.value = to
      return
    }

    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / LED_TWEEN_MS)
      const eased = 1 - (1 - t) ** 3
      displayed.value = from + (to - from) * eased
      frame = t < 1 ? requestAnimationFrame(step) : 0
    }
    frame = requestAnimationFrame(step)
  }
)

onBeforeUnmount(stop)

// A long autoplay run reaches sums the display has no room for: cents go
// first, then the figure is abbreviated
const text = computed(() => {
  const value = displayed.value
  if (props.format === 'count') return formatCount(value)

  const sign = props.format === 'signed-euro'
  const size = Math.abs(value)
  if (size >= LED_COMPACT_FROM) {
    return `${sign && value > 0 ? '+' : ''}${formatEuroCompact(value)}`
  }
  return formatEuro(value, {
    sign,
    decimals: size >= LED_WHOLE_EURO_FROM ? 0 : 2,
  })
})
</script>
