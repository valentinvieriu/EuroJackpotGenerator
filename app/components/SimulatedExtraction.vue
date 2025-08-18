<template>
  <div class="casino-card-premium rounded-lg p-4">
    <h3
      class="text-casino-gold text-premium-glow mb-4 text-center text-xl font-semibold tracking-wide"
    >
      Simulated Extraction
    </h3>
    <div class="flex flex-col items-center justify-around gap-6 md:flex-row">
      <div class="text-center">
        <h4
          class="mb-3 text-lg font-semibold tracking-wider text-content-primary uppercase"
        >
          Main Numbers
        </h4>
        <TransitionGroup
          name="ball"
          tag="div"
          class="flex flex-wrap justify-center gap-3"
          appear
        >
          <TicketNumber
            v-for="(number, index) in result.mainNumbers"
            :key="`main-${number}`"
            :number="number"
            :is-winner="true"
            :style="{ '--stagger-delay': `${index * 100}ms` }"
          />
        </TransitionGroup>
      </div>
      <div class="text-center">
        <h4
          class="mb-3 text-lg font-semibold tracking-wider text-content-primary uppercase"
        >
          Euro Numbers
        </h4>
        <TransitionGroup
          name="ball"
          tag="div"
          class="flex flex-wrap justify-center gap-3"
          appear
        >
          <TicketNumber
            v-for="(number, index) in result.euroNumbers"
            :key="`euro-${number}`"
            :number="number"
            :is-winner="true"
            type="euro"
            :style="{ '--stagger-delay': `${index * 100}ms` }"
          />
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Ticket } from '~/schemas'
import TicketNumber from './TicketNumber.vue'

interface Props {
  result: Pick<Ticket, 'mainNumbers' | 'euroNumbers'>
}

defineProps<Props>()
</script>

<style scoped>
/* Ball transition animations */
.ball-enter-active {
  transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  transition-delay: var(--stagger-delay, 0ms);
}

.ball-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transition-delay: calc(var(--stagger-delay, 0ms) * 0.5);
}

.ball-enter-from {
  opacity: 0;
  transform: translateY(-60px) scale(0.8) rotateZ(-180deg);
}

.ball-leave-to {
  opacity: 0;
  transform: translateY(60px) scale(0.6) rotateZ(180deg);
}

.ball-enter-to,
.ball-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1) rotateZ(0deg);
}

/* Add a subtle bounce effect when balls settle */
.ball-enter-active {
  animation: ball-settle 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  animation-delay: var(--stagger-delay, 0ms);
}

@keyframes ball-settle {
  0% {
    transform: translateY(-60px) scale(0.8) rotateZ(-180deg);
  }
  60% {
    transform: translateY(-8px) scale(1.05) rotateZ(-20deg);
  }
  80% {
    transform: translateY(4px) scale(0.98) rotateZ(10deg);
  }
  100% {
    transform: translateY(0) scale(1) rotateZ(0deg);
  }
}

/* Ensure smooth transitions for the container */
.ball-move {
  transition: transform 0.3s ease;
}
</style>
