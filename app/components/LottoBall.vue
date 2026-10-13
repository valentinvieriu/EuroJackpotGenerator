<template>
  <span
    :class="[
      'lotto-ball',
      {
        'lotto-ball--euro': type === 'euro',
        'lotto-ball--hit': hit,
        'lotto-ball--dim': dim,
        'lotto-ball--sm': size === 'sm',
        'lotto-ball--lg': size === 'lg',
      },
    ]"
    role="img"
    :aria-label="label"
  >
    <span class="lotto-ball__num" aria-hidden="true">{{ number }}</span>
    <span v-if="type === 'euro'" class="lotto-ball__star" aria-hidden="true">
      ★
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  number: number
  type?: 'main' | 'euro'
  /** Matched or drawn: the ball turns gold */
  hit?: boolean
  /** Missed: the ball recedes so the hits stand out */
  dim?: boolean
  /** Omit to inherit the size from the surrounding context */
  size?: 'sm' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'main',
  hit: false,
  dim: false,
  size: undefined,
})

const label = computed(() => {
  const kind = props.type === 'euro' ? 'Euro number' : 'Number'
  return `${kind} ${props.number}${props.hit ? ', matched' : ''}`
})
</script>
