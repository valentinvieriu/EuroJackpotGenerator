<template>
  <div>
    <SlotMachine @customize="showCustomizationOverlay = true" />

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

    <div v-else class="mt-10 grid gap-6 lg:grid-cols-5 lg:items-start">
      <!-- Tickets -->
      <section
        class="casino-card min-w-0 rounded-2xl p-3 sm:p-5 lg:sticky lg:top-6 lg:col-span-2"
        aria-labelledby="tickets-heading"
      >
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="tickets-heading"
              class="text-lg font-semibold text-content-primary"
            >
              Your tickets
            </h2>
            <p class="text-sm text-content-muted">
              {{ tickets.length }}
              {{ tickets.length === 1 ? 'ticket' : 'tickets' }} ·
              {{ formatEuro(ticketsStore.stakePerDraw) }} per draw
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg px-2 py-1 text-sm text-brand-gold underline underline-offset-4 transition-colors duration-150 hover:text-brand-gold-light"
              title="Create a shareable link for this setup"
              @click="ticketsStore.share"
            >
              Share
            </button>
            <button
              type="button"
              class="rounded-lg border border-casino-blue/50 px-3 py-1 text-sm text-content-secondary transition-colors duration-150 hover:border-casino-blue-light hover:text-content-primary"
              @click="showCustomizationOverlay = true"
            >
              Customize
            </button>
            <button
              type="button"
              class="rounded-lg border border-casino-blue/50 px-3 py-1 text-sm text-content-secondary transition-colors duration-150 hover:border-error hover:text-error-light"
              @click="resetTickets"
            >
              Reset
            </button>
          </div>
        </div>

        <!-- Lucky Numbers sharing dialog -->
        <div v-if="showSharingDialog" class="well mb-4 p-4">
          <div class="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 class="font-semibold text-brand-gold-light">
                Lucky Numbers “{{ sharingLuckyCode }}”
              </h3>
              <p class="text-sm text-content-muted">
                Share this link to pass on your setup: ticket format, number of
                tickets and selection method.
              </p>
            </div>
            <button
              type="button"
              class="rounded-full p-1.5 text-content-muted transition-colors duration-150 hover:text-content-secondary"
              aria-label="Close"
              @click="hideSharing"
            >
              ✕
            </button>
          </div>
          <div class="flex gap-2">
            <input
              :value="shareableUrl"
              readonly
              aria-label="Shareable link"
              class="form-select min-w-0 flex-1 font-mono text-sm"
            />
            <button
              type="button"
              :class="[
                'rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150',
                copySuccess
                  ? 'bg-interactive-success text-content-inverse'
                  : 'bg-brand-gold text-content-inverse hover:bg-brand-gold-light',
              ]"
              @click="copyShareableUrl"
            >
              {{ copySuccess ? 'Copied' : 'Copy link' }}
            </button>
          </div>
        </div>

        <TransitionGroup
          name="ticket"
          tag="ul"
          class="space-y-2 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-1"
        >
          <TicketItem
            v-for="(ticket, index) in tickets"
            :key="ticket.id"
            :ticket="ticket"
            :ticket-number="ticket.id"
            :has-draw="hasDraw"
            :style="{ '--entry-delay': `${Math.min(index, 12) * 30}ms` }"
            @delete="ticketsStore.removeTicket"
          />
        </TransitionGroup>
      </section>

      <!-- The long run -->
      <section
        class="casino-card min-w-0 rounded-2xl p-4 sm:p-6 lg:col-span-3"
        aria-labelledby="long-run-heading"
      >
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="long-run-heading"
            class="text-lg font-semibold text-content-primary"
          >
            The long run
          </h2>
          <div class="tab-list" role="tablist" aria-label="Long-run views">
            <button
              v-for="tab in TABS"
              :id="`tab-${tab.id}`"
              :key="tab.id"
              type="button"
              role="tab"
              class="tab"
              :aria-selected="activeTab === tab.id"
              :aria-controls="`panel-${tab.id}`"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- v-show keeps a running autoplay alive while the paytable is open -->
        <div
          v-show="activeTab === 'autoplay'"
          id="panel-autoplay"
          role="tabpanel"
          aria-labelledby="tab-autoplay"
        >
          <MonteCarloPanel :tickets="tickets" />
        </div>
        <div
          v-show="activeTab === 'paytable'"
          id="panel-paytable"
          role="tabpanel"
          aria-labelledby="tab-paytable"
        >
          <PaytableTable />
        </div>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSimulationPanelState } from '~/composables/useAppState'
import SlotMachine from './SlotMachine.vue'
import MonteCarloPanel from './MonteCarloPanel.vue'
import PaytableTable from './PaytableTable.vue'
import TicketItem from './TicketItem.vue'
import CustomizationOverlay from './CustomizationOverlay.vue'
import { logger } from '~/utils/logger'
import { formatEuro } from '~/utils/format'
import {
  formatTicketType,
  copyConfigUrl,
  getAppConfigUrl,
  type AppConfig,
} from '~/utils/urlHash'

const TABS = [
  { id: 'autoplay', label: 'Autoplay' },
  { id: 'paytable', label: 'Paytable' },
] as const

const ticketsStore = useTicketsStore()
const simStore = useSimulationStore()
const { drawRevealed } = useSimulationPanelState()

const {
  showSharingDialog,
  sharingLuckyCode,
  copySuccess,
  showWelcomeMessage,
  welcomeLuckyCode,
  hideWelcome,
  hideSharing,
  setCopySuccess,
} = useUIState()

const showCustomizationOverlay = ref(false)
const activeTab = ref<(typeof TABS)[number]['id']>('autoplay')

// Matches stay hidden until the reels have landed, so the tickets don't spoil the draw
const hasDraw = computed(
  () => drawRevealed.value && simStore.hasSingleDrawResults
)
const tickets = computed(() =>
  drawRevealed.value
    ? ticketsStore.getDecoratedTickets('single')
    : [...ticketsStore.state.tickets].sort((a, b) => a.id - b.id)
)

const shareConfig = computed<AppConfig>(() => ({
  system: formatTicketType(
    ticketsStore.state.config.mainCount,
    ticketsStore.state.config.euroCount
  ),
  tickets: ticketsStore.state.config.ticketCount,
  method: ticketsStore.state.config.method,
  lucky: sharingLuckyCode.value,
}))

const shareableUrl = computed(() =>
  sharingLuckyCode.value ? getAppConfigUrl(shareConfig.value) : ''
)

const copyShareableUrl = async (): Promise<void> => {
  try {
    await copyConfigUrl(shareConfig.value)
    setCopySuccess()
  } catch (error) {
    logger.error('Failed to copy URL:', error)
  }
}

const resetTickets = (): void => {
  // Tickets store notifies the simulation store internally
  ticketsStore.reset()
  hideWelcome()
  hideSharing()
}

// Restore a shared or bookmarked configuration from the URL
onMounted(() => {
  ticketsStore.handleUrlConfiguration()
})
</script>

<style scoped>
.ticket-enter-active {
  transition:
    opacity 0.3s var(--ease-standard),
    transform 0.3s var(--ease-standard);
  transition-delay: var(--entry-delay, 0ms);
}
.ticket-leave-active {
  transition: opacity 0.2s var(--ease-standard);
}
.ticket-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.ticket-leave-to {
  opacity: 0;
}
.ticket-move {
  transition: transform 0.35s var(--ease-standard);
}
</style>
