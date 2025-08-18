<template>
  <div class="casino-card-premium hover-lift sticky top-4 rounded-lg p-6">
    <div class="mb-6">
      <h3 class="text-section-title mb-4 text-lg">Summary</h3>

      <div class="mb-6 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-content-muted">Price per ticket:</span>
          <span class="text-money">€{{ pricePerTicket.toFixed(2) }}</span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-sm text-content-muted">Quantity:</span>
          <span class="font-numbers">{{ ticketCount }}</span>
        </div>

        <div class="border-t border-border-secondary/30 pt-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-content-muted">Total:</span>
            <div class="text-right">
              <div class="text-money text-2xl">
                €{{ totalPrice.toFixed(2) }}
              </div>
              <div class="text-xs text-content-muted">
                €{{ pricePerTicket.toFixed(2) }} × {{ ticketCount }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="nextDrawDate" class="mb-6 text-center">
        <div class="mb-1 text-xs text-content-muted">Next draw:</div>
        <div class="text-sm text-brand-gold">{{ nextDrawDate }}</div>
      </div>
    </div>

    <button
      :disabled="props.disabled"
      type="submit"
      class="btn-casino-gold focus-gold w-full rounded-md px-6 py-3 text-lg font-bold disabled:cursor-wait disabled:opacity-50"
    >
      {{ props.buttonText }}
    </button>

    <button
      v-if="props.showSimulateAction && !props.disabled"
      type="button"
      class="mt-3 w-full text-sm font-medium text-brand-gold underline transition-colors duration-150 hover:text-brand-gold-light"
      @click="$emit('simulate')"
    >
      Simulate {{ ticketCount }} draw{{ ticketCount > 1 ? 's' : '' }}
    </button>

    <div class="mt-6 text-center">
      <div
        class="inline-flex items-center rounded-full bg-surface-primary/40 px-2 py-1"
      >
        <svg
          class="mr-1 h-3 w-3 text-premium-emerald-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="text-xs text-content-secondary">No account required</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  buttonText?: string
  disabled?: boolean
  showSimulateAction?: boolean
  nextDrawDate?: string
}

const props = withDefaults(defineProps<Props>(), {
  buttonText: 'Generate Numbers',
  disabled: false,
  showSimulateAction: true,
  nextDrawDate: undefined,
})

defineEmits<{
  simulate: []
}>()

const ticketsStore = useTicketsStore()
const pricePerTicket = computed(() => ticketsStore.systemCost)
const ticketCount = computed(() => ticketsStore.state.config.ticketCount)
const totalPrice = computed(() => ticketsStore.totalPrice)
</script>
