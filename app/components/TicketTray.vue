<template>
  <section
    class="casino-card mx-auto max-w-3xl rounded-2xl p-3 sm:p-5"
    aria-labelledby="tickets-heading"
  >
    <!-- The bet: always on show, whatever the machine is doing -->
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div class="min-w-0">
        <h2
          id="tickets-heading"
          class="text-lg font-semibold text-content-primary"
        >
          Your tickets
        </h2>
        <p
          class="flex flex-wrap items-center gap-x-2 text-sm text-content-muted"
        >
          <span>
            {{ formatCount(tickets.length) }}
            {{ tickets.length === 1 ? 'ticket' : 'tickets' }} ·
            {{ formatEuro(ticketsStore.stakePerDraw) }} per spin
          </span>
          <span v-if="!open && winnerCount > 0" class="chip chip--gold">
            {{ formatCount(winnerCount) }} won
          </span>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="tray-button"
          :disabled="locked"
          :title="
            locked
              ? 'Autoplay is playing these tickets'
              : 'Choose other tickets'
          "
          @click="emit('customize')"
        >
          Change tickets
        </button>
        <button
          type="button"
          class="tray-button flex items-center gap-1.5"
          :aria-expanded="open"
          aria-controls="ticket-tray"
          @click="emit('update:open', !open)"
        >
          {{ open ? 'Hide' : 'Show' }}
          <svg
            :class="[
              'h-4 w-4 transition-transform duration-150',
              { 'rotate-180': open },
            ]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="open" id="ticket-tray" class="mt-4">
      <!-- The two things that need the numbers themselves -->
      <div
        class="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 px-1 text-sm"
      >
        <button
          type="button"
          class="text-brand-gold underline underline-offset-4 transition-colors duration-150 hover:text-brand-gold-light"
          title="Create a link that brings back exactly these tickets"
          @click="ticketsStore.share"
        >
          Share these tickets
        </button>
        <button
          v-if="fitsLottoBayern"
          type="button"
          class="text-content-secondary underline underline-offset-4 transition-colors duration-150 hover:text-content-primary"
          title="Enter these tickets into Lotto Bayern’s Eurojackpot form"
          :aria-expanded="showLottoBayern"
          @click="showLottoBayern = !showLottoBayern"
        >
          Fill on Lotto Bayern →
        </button>
      </div>

      <LottoBayernExport
        v-if="showLottoBayern && fitsLottoBayern"
        @close="showLottoBayern = false"
      />

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

      <TransitionGroup name="ticket" tag="ul" class="ticket-grid">
        <TicketItem
          v-for="(ticket, index) in tickets"
          :key="ticket.id"
          :ticket="ticket"
          :ticket-number="ticket.id"
          :has-draw="hasDraw"
          :removable="!locked"
          :style="{ '--entry-delay': `${Math.min(index, 12) * 30}ms` }"
          @delete="ticketsStore.removeTicket"
        />
      </TransitionGroup>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSimulationPanelState } from '~/composables/useAppState'
import TicketItem from './TicketItem.vue'
import LottoBayernExport from './LottoBayernExport.vue'
import { logger } from '~/utils/logger'
import { formatEuro, formatCount } from '~/utils/format'
import {
  formatTicketType,
  copyConfigUrl,
  getAppConfigUrl,
  type AppConfig,
} from '~/utils/urlHash'

interface Props {
  /** Whether the tickets themselves are on show, or only their summary */
  open: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  customize: []
}>()

const ticketsStore = useTicketsStore()
const simStore = useSimulationStore()
const { drawRevealed } = useSimulationPanelState()

const {
  showSharingDialog,
  sharingLuckyCode,
  copySuccess,
  hideSharing,
  setCopySuccess,
} = useUIState()

const showLottoBayern = ref(false)

// A run is scored on the tickets it started with, so they hold still meanwhile
const locked = computed(() => simStore.isRunning)

// Matches stay hidden until the reels have landed, so the tickets don't spoil the draw
const hasDraw = computed(
  () => drawRevealed.value && simStore.hasSingleDrawResults
)
const tickets = computed(() =>
  drawRevealed.value
    ? ticketsStore.getDecoratedTickets('single')
    : [...ticketsStore.state.tickets].sort((a, b) => a.id - b.id)
)

const winnerCount = computed(() =>
  hasDraw.value
    ? tickets.value.filter((ticket) =>
        Object.values(ticket.winClassCounts ?? {}).some((count) => count > 0)
      ).length
    : 0
)

// Lotto Bayern's form takes standard lines only; with none, there is nothing to offer
const fitsLottoBayern = computed(
  () => ticketsStore.lottoBayernExport.lines.length > 0
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
</script>

<style scoped>
.tray-button {
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid
    color-mix(in oklab, var(--color-casino-blue) 50%, transparent);
  font-size: 0.875rem;
  color: var(--color-content-secondary);
  transition:
    border-color var(--duration-150) var(--ease-standard),
    color var(--duration-150) var(--ease-standard);
}
.tray-button:hover:not(:disabled) {
  border-color: var(--color-casino-blue-light);
  color: var(--color-content-primary);
}
.tray-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* As many columns as fit */
.ticket-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
  gap: 0.5rem;
}
/* With room for a scroll area of its own, a long list stays inside the tray.
   On a phone it runs with the page: a scroller inside a scroller traps the thumb. */
@media (min-width: 40rem) {
  .ticket-grid {
    max-block-size: 70vh;
    overflow-y: auto;
    padding-inline-end: 0.25rem;
  }
}

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
