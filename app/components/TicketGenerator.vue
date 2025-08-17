<template>
  <div>
    <!-- Hero Section for Simple Mode or Empty State -->
    <HeroSection v-if="!ticketsStore.hasTickets" />

    <!-- Main Content Grid -->
    <div
      v-if="ticketsStore.hasTickets || ticketsStore.isCustomMode"
      :class="[
        'transition-all duration-500 ease-in-out',
        tickets.length > 0
          ? 'flex flex-col-reverse gap-6 lg:flex-row lg:grid lg:grid-cols-5 lg:gap-6 lg:items-stretch'
          : 'block',
      ]"
    >
      <!-- Welcome message for shared Lucky Numbers -->
      <div
        v-if="showWelcomeMessage"
        class="col-span-full casino-card rounded-lg p-4 mb-6 relative glow-gold"
      >
        <div class="flex items-start gap-3">
          <div class="text-2xl">🎯</div>
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-brand-gold-light mb-1">
              Welcome to Lucky Numbers "{{ welcomeLuckyCode }}"!
            </h3>
            <p class="text-sm text-content-secondary">
              Someone shared their ticket configuration with you. The settings
              below have been loaded automatically. Click "Generate Numbers" to
              create the exact same tickets they had!
            </p>
          </div>
          <button
            class="text-content-muted hover:text-content-secondary transition duration-150 p-1"
            title="Dismiss"
            @click="dismissWelcomeMessage"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        :class="[
          'space-y-6 transition-all duration-500',
          tickets.length > 0 ? 'lg:col-span-2' : 'w-full',
        ]"
      >
        <!-- Lucky Numbers Sharing Dialog -->
        <div
          v-if="showSharingDialog"
          class="casino-card-premium rounded-lg p-6"
        >
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-semibold text-brand-gold-light mb-1">
                🎉 Lucky Numbers Created!
              </h3>
              <p class="text-sm text-content-muted">
                Your configuration has been saved as "{{ sharingLuckyCode }}"
              </p>
            </div>
            <button
              class="text-content-muted hover:text-content-secondary transition duration-150"
              title="Close"
              @click="hideSharing"
            >
              ✕
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-content-muted mb-2">
                Shareable link:
              </label>
              <div class="flex gap-2">
                <input
                  :value="shareableUrl"
                  readonly
                  class="flex-1 px-3 py-2 bg-surface-primary border border-casino-blue-light/50 rounded-md text-content-secondary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-gold-400"
                />
                <button
                  :class="[
                    'px-4 py-2 text-sm font-medium rounded-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-brand-gold-400',
                    copySuccess
                      ? 'bg-green-600 text-content-primary'
                      : 'bg-brand-gold text-casino-blue-dark hover:bg-brand-gold-light',
                  ]"
                  @click="copyShareableUrl"
                >
                  {{ copySuccess ? '✓ Copied!' : 'Copy Link' }}
                </button>
              </div>
            </div>

            <div
              class="text-xs text-content-muted bg-surface-primary/40 p-3 rounded-md"
            >
              <strong>💡 How it works:</strong> Anyone with this link can
              recreate your exact ticket configuration and numbers. The lucky
              code "{{ sharingLuckyCode }}" ensures the same results every time.
            </div>
          </div>
        </div>

        <!-- Generated Tickets Section (moved to left column) -->
        <div
          v-if="
            tickets.length &&
            !loading &&
            (!showGenerationForm || !ticketsStore.isCustomMode)
          "
        >
          <div class="casino-card-premium rounded-lg p-6">
            <div class="flex justify-between items-center mb-4">
              <h2
                class="text-xl font-semibold text-casino-gold text-premium-glow"
              >
                Generated Tickets ({{ tickets.length }})
              </h2>
              <div class="flex gap-2">
                <button
                  class="px-2 py-1 text-sm text-brand-gold hover:text-brand-gold-light underline transition duration-150 focus:outline-none focus:ring-2 focus:ring-brand-gold-400 rounded"
                  title="Create shareable link for these numbers"
                  @click="ticketsStore.share"
                >
                  Share
                </button>
                <button
                  v-if="ticketsStore.isCustomMode"
                  class="px-3 py-1 text-sm bg-surface-secondary hover:bg-surface-card-hover text-content-primary rounded-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-brand-gold-400"
                  @click="toggleGenerationForm()"
                >
                  Modify
                </button>
                <button
                  v-else
                  class="px-3 py-1 text-sm bg-surface-secondary hover:bg-surface-card-hover text-content-primary rounded-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-brand-gold-400"
                  @click="handleCustomizeFromSimpleMode()"
                >
                  Customize
                </button>
                <button
                  class="px-3 py-1 text-sm border border-border-primary text-brand-gold rounded-md transition duration-150 hover:bg-brand-gold hover:text-casino-blue-dark focus:outline-none focus:ring-2 focus:ring-brand-gold-400"
                  @click="resetTickets"
                >
                  Reset
                </button>
              </div>
            </div>

            <div class="space-y-4">
              <TicketComponent
                v-for="ticket in tickets"
                :key="ticket.id"
                :ticket="ticket"
                :ticket-number="ticket.id"
                @delete="handleDeleteTicket"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="tickets.length > 0"
        :class="['transition-all duration-500', 'lg:col-span-3']"
      >
        <div class="casino-card-premium rounded-lg p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold text-brand-gold-light">
              Simulation
            </h2>
            <div
              v-if="!loading"
              class="flex border-b border-casino-blue-light/30"
            >
              <button
                :class="[
                  'px-3 py-1 text-sm font-medium transition-colors duration-200 border-b-2 relative',
                  activeMode === 'single'
                    ? 'text-brand-gold border-border-primary'
                    : 'text-content-muted border-transparent hover:text-content-secondary',
                ]"
                @click="handleModeChange('single')"
              >
                Single Draw
              </button>
              <button
                :class="[
                  'px-3 py-1 text-sm font-medium transition-colors duration-200 border-b-2 relative',
                  activeMode === 'montecarlo'
                    ? 'text-brand-gold border-border-primary'
                    : 'text-content-muted border-transparent hover:text-content-secondary',
                ]"
                @click="handleModeChange('montecarlo')"
              >
                Monte Carlo
              </button>
            </div>
          </div>

          <div v-if="loading" class="text-center text-content-muted my-8">
            <svg
              class="animate-spin h-8 w-8 text-brand-gold-light mx-auto"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p class="mt-2">Processing {{ currentOperation }}...</p>
          </div>

          <div
            v-else-if="error"
            class="text-center text-error bg-red-900/50 border border-red-500 p-4 rounded-md"
            role="alert"
          >
            {{ error }}
          </div>

          <div v-else-if="!loading">
            <SingleDrawPanel
              v-if="activeMode === 'single'"
              :tickets="tickets"
            />
            <MonteCarloPanel
              v-if="activeMode === 'montecarlo'"
              :tickets="tickets"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Customization Overlay -->
    <CustomizationOverlay
      :is-open="showCustomizationOverlay"
      @close="showCustomizationOverlay = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSimulationPanelState } from '~/composables/useAppState'
import HeroSection from './HeroSection.vue'
import SingleDrawPanel from './SingleDrawPanel.vue'
import MonteCarloPanel from './MonteCarloPanel.vue'
import TicketComponent from './TicketItem.vue'
import { logger } from '~/utils/logger'
import {
  formatTicketType,
  copyConfigUrl,
  getAppConfigUrl,
  type AppConfig,
} from '~/utils/urlHash'
import CustomizationOverlay from './CustomizationOverlay.vue'

// Store
const ticketsStore = useTicketsStore()

// Use store-derived decorated tickets (with highlights)
const tickets = computed(() =>
  ticketsStore.getDecoratedTickets(activeMode.value)
)
const loading = computed(() => ticketsStore.isGenerating)

// Error handling using centralized state
const error = computed(() => ticketsStore.state.error || '')

// UI mode (using shared simulation panel state)
const { activeMode, setMode } = useSimulationPanelState()

// Store-derived decorated tickets automatically update when simulation results change
// No manual highlight application needed - tickets computed property handles this reactively

// UI state (now using centralized state management)
const {
  showGenerationForm,
  toggleGenerationForm,
  showSharingDialog,
  sharingLuckyCode,
  copySuccess,
  showWelcomeMessage,
  welcomeLuckyCode,
  currentOperation,
  hideWelcome,
  hideSharing,
  setCopySuccess,
} = useUIState()

// Overlay state
const showCustomizationOverlay = ref(false)

// Computed shareable URL based on current configuration and sharing lucky code
const shareableUrl = computed(() => {
  if (!sharingLuckyCode.value) return ''

  const config: AppConfig = {
    system: formatTicketType(
      ticketsStore.state.config.mainCount,
      ticketsStore.state.config.euroCount
    ),
    tickets: ticketsStore.state.config.ticketCount,
    method: ticketsStore.state.config.method,
    lucky: sharingLuckyCode.value,
  }

  return getAppConfigUrl(config)
})

// Configuration helpers no longer needed; URL sync handled in store

const handleModeChange = (m: 'single' | 'montecarlo'): void => {
  setMode(m)
  ticketsStore.clearError()

  // Highlights will automatically update via computed tickets property
}

const clearTickets = (): void => {
  // Use semantic action for user-initiated reset
  // Tickets store will notify simulation store internally
  ticketsStore.reset()
}

const resetTickets = (): void => {
  clearTickets()
  if (showGenerationForm.value) toggleGenerationForm()
  hideWelcome()
}

const handleDeleteTicket = (ticketId: number): void => {
  // Use semantic action - let the store handle the entire deletion process
  ticketsStore.removeTicket(ticketId)
}

const handleCustomizeFromSimpleMode = (): void => {
  showCustomizationOverlay.value = true
}

// Sharing functions (now simplified using centralized state)
const copyShareableUrl = async (): Promise<void> => {
  try {
    const config: AppConfig = {
      system: formatTicketType(
        ticketsStore.state.config.mainCount,
        ticketsStore.state.config.euroCount
      ),
      tickets: ticketsStore.state.config.ticketCount,
      method: ticketsStore.state.config.method,
      lucky: sharingLuckyCode.value,
    }

    await copyConfigUrl(config)
    setCopySuccess(2000)
  } catch (error) {
    logger.error('Failed to copy URL:', error)
  }
}

// URL handling for configuration restoration

const dismissWelcomeMessage = (): void => {
  hideWelcome()
}

// Load configuration from URL on mount
onMounted(() => {
  // Use tickets store to handle URL configuration
  ticketsStore.handleUrlConfiguration()
})
</script>

<style scoped>
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type='number'] {
  appearance: textfield;
  -moz-appearance: textfield;
}
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
@media (min-width: 1024px) {
  .grid {
    transition: grid-template-columns 500ms ease-in-out;
  }
}
</style>
