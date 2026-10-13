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
import { LED_TWEEN_MS } from '~/utils/constants'
import { formatEuro, formatCount } from '~/utils/format'

interface Props {
  label: string
  value: number
  format?: 'euro' | 'signed-euro' | 'count'
  tone?: 'neutral' | 'loss' | 'gain'
}

const props = withDefaults(defineProps<Props>(), {
  format: 'euro',
  tone: 'neutral',
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
    if (reduceMotion || from === to) {
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

const text = computed(() => {
  if (props.format === 'count') return formatCount(displayed.value)
  return formatEuro(displayed.value, { sign: props.format === 'signed-euro' })
})
</script>
