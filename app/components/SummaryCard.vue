<template>
  <div class="casino-card-premium rounded-lg p-6 sticky top-4 hover-lift">
    <div class="mb-6">
      <h3 class="text-lg text-section-title mb-4">Summary</h3>

      <div class="space-y-3 mb-6">
        <div class="flex justify-between items-center">
          <span class="text-content-muted text-sm">Price per ticket:</span>
          <span class="text-money">€{{ pricePerTicket.toFixed(2) }}</span>
        </div>

        <div class="flex justify-between items-center">
          <span class="text-content-muted text-sm">Quantity:</span>
          <span class="font-numbers">{{ ticketCount }}</span>
        </div>

        <div class="border-t border-border-secondary/30 pt-3">
          <div class="flex justify-between items-center">
            <span class="text-content-muted text-sm">Total:</span>
            <div class="text-right">
              <div class="text-2xl text-money">
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
        <div class="text-xs text-content-muted mb-1">Next draw:</div>
        <div class="text-sm text-brand-gold">{{ nextDrawDate }}</div>
      </div>
    </div>

    <button
      :disabled="props.disabled"
      type="submit"
      class="w-full btn-casino-gold px-6 py-3 rounded-md font-bold focus-gold disabled:opacity-50 disabled:cursor-wait text-lg"
    >
      {{ props.buttonText }}
    </button>

    <button
      v-if="props.showSimulateAction && !props.disabled"
      type="button"
      class="w-full mt-3 text-brand-gold hover:text-brand-gold-light underline text-sm font-medium transition-colors duration-150"
      @click="$emit('simulate')"
    >
      Simulate {{ ticketCount }} draw{{ ticketCount > 1 ? 's' : '' }}
    </button>

    <div class="mt-6 text-center">
      <div
        class="inline-flex items-center px-2 py-1 bg-surface-primary/40 rounded-full"
      >
        <svg
          class="w-3 h-3 text-premium-emerald-400 mr-1"
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
