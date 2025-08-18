<template>
  <!-- TicketItem component - renamed to meet multi-word requirement -->
  <div
    :class="[
      'rounded-lg p-4 transition-all duration-300',
      isWinner
        ? 'casino-card-premium border-2 border-border-primary ring-2 ring-brand-gold-400/50 glow-gold'
        : 'casino-card hover-lift',
    ]"
  >
    <div class="flex justify-between items-start mb-3">
      <h3 class="font-semibold text-content-primary">
        Ticket #{{ ticketNumber }}
        <span v-if="ticket.linesCount" class="ml-2 text-sm text-content-muted">
          ({{ ticket.linesCount }} lines)
        </span>
        <Transition name="winner-badge" appear>
          <span
            v-if="ticket.winClass"
            :class="['ml-2 font-bold', getWinClassTextClass(ticket.winClass)]"
          >
            🏆 Winner Class {{ ticket.winClass }}!
          </span>
        </Transition>
      </h3>
      <button
        class="text-content-muted hover:text-error hover:bg-error-dark/20 rounded-full p-1 transition-colors duration-200 flex-shrink-0"
        title="Delete this ticket"
        @click="emit('delete', ticket.id)"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
    <div class="mb-3">
      <span class="font-medium text-sm text-content-muted block mb-1"
        >Main Numbers:</span
      >
      <div class="flex flex-wrap gap-2">
        <TransitionGroup
          name="winning-number"
          tag="div"
          class="flex flex-wrap gap-2"
        >
          <TicketNumber
            v-for="(number, index) in ticket.mainNumbers"
            :key="'main-' + number"
            :number="number"
            :is-winner="ticket.winningMainNumbers?.includes(number) || false"
            :style="{ '--win-delay': `${index * 50}ms` }"
          />
        </TransitionGroup>
      </div>
    </div>
    <div>
      <span class="font-medium text-sm text-content-muted block mb-1"
        >Euro Numbers:</span
      >
      <div class="flex flex-wrap gap-2">
        <TransitionGroup
          name="winning-number"
          tag="div"
          class="flex flex-wrap gap-2"
        >
          <TicketNumber
            v-for="(number, index) in ticket.euroNumbers"
            :key="'euro-' + number"
            :number="number"
            :is-winner="ticket.winningEuroNumbers?.includes(number) || false"
            type="euro"
            :style="{
              '--win-delay': `${(index + ticket.mainNumbers.length) * 50}ms`,
            }"
          />
        </TransitionGroup>
      </div>
    </div>

    <!-- Per-class breakdown for system tickets -->
    <Transition name="prize-reveal" appear>
      <div
        v-if="winClassBreakdown.length > 0"
        class="mt-3 pt-3 border-t border-casino-blue-light/30"
      >
        <span class="font-medium text-sm text-content-muted block mb-1"
          >Winning Lines:</span
        >
        <div class="flex flex-wrap gap-2">
          <TransitionGroup
            name="prize-chip"
            tag="div"
            class="flex flex-wrap gap-2"
            appear
          >
            <span
              v-for="({ winClass, count }, index) in winClassBreakdown"
              :key="winClass"
              :class="[getWinClassChipClasses(winClass), 'cursor-help']"
              :title="getPrizeTooltip(winClass, count)"
              :style="{ '--chip-delay': `${index * 100}ms` }"
            >
              {{ count }}×Class {{ winClass }}
            </span>
          </TransitionGroup>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { WIN_CLASS_TIER_1_MAX, WIN_CLASS_TIER_2_MAX } from '~/utils/constants'
import { computed } from 'vue'
import type { Ticket } from '~/schemas'
import TicketNumber from './TicketNumber.vue'

interface Props {
  ticket: Ticket
  ticketNumber: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  delete: [ticketId: number]
}>()

const isWinner = computed(() => !!props.ticket.winClass)

const winClassBreakdown = computed(() => {
  if (!props.ticket.winClassCounts) return []

  return Object.entries(props.ticket.winClassCounts)
    .map(([winClass, count]) => ({ winClass: Number(winClass), count }))
    .sort((a, b) => a.winClass - b.winClass)
})

// Read payout odds from centralized store (with fallback odds when needed)
const oddsStore = useOddsStore()
const payoutMap = computed(() => oddsStore.getPayoutMap())

const calculatePrizeAmount = (winClass: number, count: number) => {
  const prizeAmount = payoutMap.value[winClass] ?? 0
  return prizeAmount * count
}

const getPrizeTooltip = (winClass: number, count: number) => {
  const totalPrize = calculatePrizeAmount(winClass, count)
  const prizeAmount = payoutMap.value[winClass] ?? 0
  if (totalPrize > 0) return `Total Prize: €${totalPrize.toFixed(2)}`
  return `${count}×Class ${winClass} winning lines${prizeAmount === 0 ? '' : ''}`
}

const getWinClassTextClass = (winClass: number) => {
  // Higher classes (lower numbers) get more prominent gold styling
  if (winClass >= 1 && winClass <= WIN_CLASS_TIER_1_MAX) {
    return 'text-brand-gold animate-pulse'
  } else if (
    winClass >= WIN_CLASS_TIER_1_MAX + 1 &&
    winClass <= WIN_CLASS_TIER_2_MAX
  ) {
    return 'text-brand-gold-light'
  } else {
    return 'text-brand-gold-dark'
  }
}

const getWinClassChipClasses = (winClass: number) => {
  const baseClasses = 'px-2 py-1 rounded-full text-xs font-semibold'

  if (winClass >= 1 && winClass <= WIN_CLASS_TIER_1_MAX) {
    return `${baseClasses} bg-brand-gold text-casino-blue-dark shadow-lg animate-pulse`
  } else if (
    winClass >= WIN_CLASS_TIER_1_MAX + 1 &&
    winClass <= WIN_CLASS_TIER_2_MAX
  ) {
    return `${baseClasses} bg-brand-gold-light text-casino-blue-dark shadow-md`
  } else {
    return `${baseClasses} bg-brand-gold-dark text-content-primary shadow-sm`
  }
}
</script>

<style scoped>
/* Winner badge slide-in animation */
.winner-badge-enter-active {
  transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.winner-badge-leave-active {
  transition: all 0.3s ease-in;
}

.winner-badge-enter-from {
  opacity: 0;
  transform: translateX(-30px) scale(0.8);
}

.winner-badge-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.8);
}

/* Winning numbers celebration */
.winning-number-enter-active {
  transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  transition-delay: var(--win-delay, 0ms);
}

.winning-number-leave-active {
  transition: all 0.2s ease-in;
}

.winning-number-enter-from {
  opacity: 0;
  transform: scale(0.5) rotateZ(-180deg);
}

.winning-number-leave-to {
  opacity: 0;
  transform: scale(0.5) rotateZ(180deg);
}

/* Prize reveal animation */
.prize-reveal-enter-active {
  transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transition-delay: 200ms;
}

.prize-reveal-leave-active {
  transition: all 0.3s ease-in;
}

.prize-reveal-enter-from {
  opacity: 0;
  transform: translateY(20px);
  max-height: 0;
}

.prize-reveal-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

/* Prize chip staggered entry */
.prize-chip-enter-active {
  transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  transition-delay: var(--chip-delay, 0ms);
}

.prize-chip-leave-active {
  transition: all 0.2s ease-in;
}

.prize-chip-enter-from {
  opacity: 0;
  transform: translateY(-15px) scale(0.9);
}

.prize-chip-leave-to {
  opacity: 0;
  transform: translateY(15px) scale(0.9);
}

/* Enhanced winner card pulsing */
.glow-gold {
  animation: winner-celebration 2s ease-in-out infinite;
}

@keyframes winner-celebration {
  0%,
  100% {
    box-shadow:
      0 0 20px var(--color-brand-gold-400),
      0 0 40px var(--color-brand-gold-300),
      inset 0 0 20px var(--color-brand-gold-400);
  }
  50% {
    box-shadow:
      0 0 30px var(--color-brand-gold-400),
      0 0 60px var(--color-brand-gold-300),
      0 0 90px var(--color-brand-gold-200),
      inset 0 0 30px var(--color-brand-gold-400);
    transform: scale(1.02);
  }
}

/* Smooth move transitions for reordering */
.winning-number-move,
.prize-chip-move {
  transition: transform 0.3s ease;
}
</style>
