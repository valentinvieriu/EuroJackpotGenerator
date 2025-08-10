<template>
  <div
    :class="[
      'inline-flex items-center justify-center text-lg font-bold transition-all duration-300 ease-in-out',
      type === 'euro'
        ? [
            'w-12 h-12 star-shape',
            // NON-winner star (muted navy)
            !isWinner
              ? 'text-ivory shadow-star bg-gradient-radial from-casino-blue-light to-casino-blue-dark'
              : // Winner star (gold)
                'text-casino-blue-dark shadow-star bg-gradient-radial from-star-gold-light to-star-gold-shadow',
          ]
        : [
            'w-10 h-10 rounded-full',
            // Main ball NON-winner (muted navy)
            !isWinner
              ? 'text-ivory shadow-ball bg-gradient-radial from-casino-blue-light to-casino-blue-dark'
              : // Winner main (gold)
                'text-casino-blue-dark shadow-ball bg-gradient-radial from-ball-yellow-light to-ball-yellow-dark',
          ],
      // Gold ring for any winner (both types)
      isWinner
        ? 'scale-110 ring-2 ring-casino-gold ring-offset-2 ring-offset-casino-blue'
        : '',
    ]"
  >
    {{ number }}
  </div>
</template>

<script setup lang="ts">
interface Props {
  number: number
  isWinner: boolean
  type?: 'main' | 'euro'
}
withDefaults(defineProps<Props>(), {
  type: 'main',
})
</script>

<style scoped>
.bg-gradient-radial {
  background-image: radial-gradient(
    circle at 30% 30%,
    var(--tw-gradient-from),
    var(--tw-gradient-to)
  );
}
.star-shape {
  clip-path: polygon(
    50% 0%,
    61% 35%,
    98% 35%,
    68% 57%,
    79% 91%,
    50% 70%,
    21% 91%,
    32% 57%,
    2% 35%,
    39% 35%
  );
  border-radius: 0;
}
</style>
