<template>
  <div>
    <SlotMachine
      @customize="showCustomizationOverlay = true"
      @paytable="showPaytable = true"
    />

    <!-- Welcome message for shared Lucky Numbers -->
    <div
      v-if="showWelcomeMessage"
      class="casino-card-premium mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-2xl p-4"
    >
      <div class="flex-1">
        <h2 class="mb-1 font-semibold text-brand-gold-light">
          Lucky Numbers “{{ welcomeLuckyCode }}”
        </h2>
        <p class="text-sm text-content-secondary">
          Someone shared their ticket setup with you. It is loaded below: spin
          to see how it does.
        </p>
      </div>
      <button
        type="button"
        class="rounded-full p-1.5 text-content-muted transition-colors duration-150 hover:text-content-secondary"
        aria-label="Dismiss"
        @click="hideWelcome"
      >
        ✕
      </button>
    </div>

    <!-- Before the first spin: the paytable, as printed on any slot machine -->
    <section
      v-if="!ticketsStore.hasTickets"
      class="casino-card mx-auto mt-10 max-w-3xl rounded-2xl p-5 sm:p-6"
      aria-labelledby="paytable-heading"
    >
      <h2
        id="paytable-heading"
        class="text-lg font-semibold text-content-primary"
      >
        Paytable
      </h2>
      <p class="mt-1 mb-4 text-sm text-content-muted">
        Every machine shows what it pays. This one also shows how unlikely each
        prize is.
      </p>
      <PaytableTable />
    </section>

    <!-- After it: what the machine is playing, then what it last did -->
    <div v-else class="mt-10 space-y-6">
      <TicketTray
        :open="ticketsOpen"
        @update:open="toggleTickets"
        @customize="showCustomizationOverlay = true"
      />

      <section
        v-if="hasRun"
        class="casino-card mx-auto max-w-3xl rounded-2xl p-4 sm:p-6"
        aria-labelledby="long-run-heading"
      >
        <h2 id="long-run-heading" class="label-plate mb-4">The long run</h2>
        <MonteCarloPanel :tickets="ticketsStore.state.tickets" />
      </section>
    </div>

    <p class="mt-10 text-center text-sm text-content-muted">
      Educational tool only. No real money is involved, and nothing here helps
      you win.
    </p>

    <CustomizationOverlay
      :is-open="showCustomizationOverlay"
      @close="showCustomizationOverlay = false"
    />
    <PaytableSheet :is-open="showPaytable" @close="showPaytable = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import SlotMachine from './SlotMachine.vue'
import TicketTray from './TicketTray.vue'
import MonteCarloPanel from './MonteCarloPanel.vue'
import PaytableTable from './PaytableTable.vue'
import PaytableSheet from './PaytableSheet.vue'
import CustomizationOverlay from './CustomizationOverlay.vue'

const ticketsStore = useTicketsStore()
const simStore = useSimulationStore()

const { showWelcomeMessage, welcomeLuckyCode, hideWelcome } = useUIState()

const showCustomizationOverlay = ref(false)
const showPaytable = ref(false)

// A run on the table: playing, finished, or failed
const hasRun = computed(() =>
  ['running', 'results', 'error'].includes(simStore.state.phase)
)

// The tickets are the story of a single spin and beside the point of a long
// run, so autoplay folds them away and the next spin by hand brings them back.
// A tray the player closed themselves stays closed.
const ticketsOpen = ref(true)
let foldedByAutoplay = false

const toggleTickets = (open: boolean) => {
  ticketsOpen.value = open
  foldedByAutoplay = false
}

watch(
  () => simStore.isRunning,
  (running) => {
    if (running && ticketsOpen.value) {
      ticketsOpen.value = false
      foldedByAutoplay = true
    }
  }
)
watch(
  () => simStore.isSingleDrawRunning,
  (running) => {
    if (running && foldedByAutoplay) {
      ticketsOpen.value = true
      foldedByAutoplay = false
    }
  }
)

// Restore a shared or bookmarked configuration from the URL
onMounted(() => {
  ticketsStore.handleUrlConfiguration()
})
</script>
