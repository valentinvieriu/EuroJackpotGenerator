<template>
  <div
    :class="[
      // Base styles: size, text, transitions
      'inline-flex items-center justify-center text-lg font-bold transition-all duration-300 ease-in-out',
      // Type-specific styles
      type === 'euro'
        ? [
            // Star shape and size
            'w-12 h-12 star-shape',
            // Star colors and shadow
            'text-casino-blue-dark shadow-star',
            'bg-gradient-radial from-star-gold to-star-gold-shadow',
          ]
        : [
            // Ball shape and size
            'w-10 h-10 rounded-full',
            // Ball colors and shadow
            'text-casino-blue-dark shadow-ball',
            'bg-gradient-radial from-ball-yellow to-ball-yellow-shadow',
          ],
      // Winner effects
      {
        // Scale-up effect for winners
        'scale-110': isWinner,
        // Star winner styles
        'shadow-star-winner from-star-gold-light to-star-gold-dark':
          isWinner && type === 'euro',
        // Ball winner styles
        'shadow-ball-winner from-ball-yellow-light to-ball-yellow-dark':
          isWinner && type === 'main',
      },
    ]"
  >
    {{ number }}
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** The number to display inside the ball/star. */
  number: number
  /** Flag indicating if this number is part of a winning combination. */
  isWinner: boolean
  /** The type of number - determines if it's displayed as a ball or star. */
  type?: 'main' | 'euro'
}

// Define component props with types and defaults.
withDefaults(defineProps<Props>(), {
  type: 'main',
})
</script>

<style scoped>
/* Custom utility class for applying the radial gradient background.
   Tailwind CSS doesn't have built-in radial gradient utilities by default.
   The gradient stops (`--tw-gradient-from`, `--tw-gradient-to`) are determined by
   the `from-*` and `to-*` classes applied in the template.
   The `circle at 30% 30%` positions the highlight towards the top-left,
   giving a common "shiny ball" lighting effect.
*/
.bg-gradient-radial {
  background-image: radial-gradient(
    circle at 30% 30%,
    var(--tw-gradient-from),
    var(--tw-gradient-to)
  );
}

/* Star shape using clip-path for a 5-pointed star */
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
  border-radius: 0; /* Override any border-radius */
}

/* Ensure winner styles correctly override base styles if specificity issues arise,
   though Tailwind's class order usually handles this.
   Example:
   .shadow-ball-winner {
      box-shadow: inset -3px -3px 8px rgba(0,0,0,0.3), inset 3px 3px 5px rgba(255,255,255,0.4), 0 0 15px 5px rgba(250, 204, 21, 0.7) !important;
   }
*/
</style>
