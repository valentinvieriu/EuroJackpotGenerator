<template>
  <div
    :class="[
      'inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold',
      'transition-all duration-300 ease-in-out',
      isWinner ? 'shadow-ball-winner scale-110' : 'shadow-ball',
      isWinner ? 'bg-gradient-radial from-ball-yellow-light to-ball-yellow-dark' : 'bg-gradient-radial from-ball-yellow to-ball-yellow-shadow',
      isWinner ? 'text-casino-blue-dark' : 'text-casino-blue-dark', // Adjust text color if needed
    ]"
  >
    {{ number }}
  </div>
</template>

<script setup lang="ts">
interface Props {
  number: number;
  isWinner: boolean;
}

defineProps<Props>();
</script>

<style scoped>
/* Add radial gradient helper class if Tailwind doesn't support it directly */
/* Or configure radial gradients in tailwind.config.js */
.bg-gradient-radial {
  background-image: radial-gradient(circle at 30% 30%, var(--tw-gradient-from), var(--tw-gradient-to));
}

/* Define the gradient stops in tailwind.config.js under theme.extend.gradientColorStops if preferred */
/* Example for tailwind.config.js:
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      gradientColorStops: theme => ({
         ...theme('colors'),
         // Define your gradients here if needed
      })
    }
  }
*/
</style>