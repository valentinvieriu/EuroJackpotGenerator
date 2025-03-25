<template>
  <div
    :class="[
      // Base styles: size, shape, text
      'inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold',
      // Text color
      'text-casino-blue-dark', // Dark text provides good contrast on the yellow ball
      // Base shadow for 3D effect
      'shadow-ball',
      // Base background gradient (applied via custom class below)
      'bg-gradient-radial from-ball-yellow to-ball-yellow-shadow',
      // Transitions for hover/winner effects
      'transition-all duration-300 ease-in-out',
      // --- Conditional styles for WINNING numbers ---
      {
        // Enhanced shadow/glow for winners
        'shadow-ball-winner': isWinner,
        // Brighter gradient for winners
        'from-ball-yellow-light to-ball-yellow-dark': isWinner,
        // Slight scale-up effect for winners
        'scale-110': isWinner,
        // Override base shadow if winner
        '!shadow-ball-winner': isWinner, // Use !important implicitly via Tailwind order or explicit `!`
         // Override base gradient if winner
        'bg-gradient-radial from-ball-yellow-light to-ball-yellow-dark': isWinner,
      }
    ]"
  >
    {{ number }}
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** The number to display inside the ball. */
  number: number;
  /** Flag indicating if this number is part of a winning combination. */
  isWinner: boolean;
}

// Define component props with types.
defineProps<Props>();
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
  background-image: radial-gradient(circle at 30% 30%, var(--tw-gradient-from), var(--tw-gradient-to));
}

/* Ensure winner styles correctly override base styles if specificity issues arise,
   though Tailwind's class order usually handles this.
   Example:
   .shadow-ball-winner {
      box-shadow: inset -3px -3px 8px rgba(0,0,0,0.3), inset 3px 3px 5px rgba(255,255,255,0.4), 0 0 15px 5px rgba(250, 204, 21, 0.7) !important;
   }
*/
</style>