<template>
  <div class="flex items-center">
    <button
      type="button"
      :disabled="modelValue <= min"
      class="w-10 h-10 flex items-center justify-center bg-casino-blue border border-casino-blue-light/50 rounded-l-md hover:bg-casino-blue-light focus:outline-none focus:ring-2 focus:ring-casino-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
      @click="decrement"
    >
      <svg
        class="w-4 h-4 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M20 12H4"
        />
      </svg>
    </button>

    <input
      :value="modelValue"
      type="number"
      :min="min"
      :max="max"
      class="w-20 h-10 px-3 text-center border-t border-b border-casino-blue-light/50 bg-casino-blue focus:outline-none focus:ring-2 focus:ring-casino-gold text-gray-200 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      @input="onInput"
      @blur="onBlur"
    />

    <button
      type="button"
      :disabled="modelValue >= max"
      class="w-10 h-10 flex items-center justify-center bg-casino-blue border border-casino-blue-light/50 rounded-r-md hover:bg-casino-blue-light focus:outline-none focus:ring-2 focus:ring-casino-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
      @click="increment"
    >
      <svg
        class="w-4 h-4 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { TICKET_COUNT_MIN, TICKET_COUNT_MAX } from '~/utils/constants'

interface Props {
  modelValue: number
  min?: number
  max?: number
}

const props = withDefaults(defineProps<Props>(), {
  min: TICKET_COUNT_MIN,
  max: TICKET_COUNT_MAX,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const increment = () => {
  if (props.modelValue < props.max) {
    emit('update:modelValue', props.modelValue + 1)
  }
}

const decrement = () => {
  if (props.modelValue > props.min) {
    emit('update:modelValue', props.modelValue - 1)
  }
}

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = Number.parseInt(target.value) || props.min
  const clampedValue = Math.max(props.min, Math.min(props.max, value))
  emit('update:modelValue', clampedValue)
}

const onBlur = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = Number.parseInt(target.value) || props.min
  const clampedValue = Math.max(props.min, Math.min(props.max, value))
  if (value !== clampedValue) {
    target.value = clampedValue.toString()
  }
  emit('update:modelValue', clampedValue)
}
</script>
