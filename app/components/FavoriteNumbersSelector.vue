<template>
  <div class="space-y-6">
    <!-- Main Numbers Section -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <label class="text-sm font-medium text-gray-400">
          Favorite Main Numbers (1-50)
        </label>
        <button
          v-if="mainNumbers.length > 0"
          type="button"
          class="text-xs text-casino-gold hover:text-casino-gold-light underline"
          @click="clearFavorites('main')"
        >
          Clear All
        </button>
      </div>

      <div class="space-y-3">
        <!-- Selected Numbers Display -->
        <div v-if="mainNumbers.length > 0" class="flex flex-wrap gap-2">
          <span
            v-for="number in mainNumbers"
            :key="`main-${number}`"
            class="inline-flex items-center gap-1 px-3 py-1 bg-casino-gold/20 border border-casino-gold/50 rounded-full text-sm font-medium text-casino-gold"
          >
            {{ number }}
            <button
              type="button"
              class="hover:text-casino-gold-light transition-colors"
              @click="removeFavorite('main', number)"
            >
              ✕
            </button>
          </span>
        </div>

        <!-- Add Number Dropdown -->
        <div v-if="mainNumbers.length < FAVORITE_NUMBERS_MAX" class="relative">
          <select
            :value="''"
            class="w-full px-3 py-2 border border-casino-blue-light/50 bg-casino-blue rounded-md focus:outline-none focus:ring-2 focus:ring-casino-gold focus:border-casino-gold text-gray-200 appearance-none cursor-pointer"
            @change="addMainNumber($event)"
          >
            <option value="" disabled class="bg-casino-blue-dark text-gray-400">
              Select a main number to add...
            </option>
            <option
              v-for="number in availableMainNumbers"
              :key="`main-option-${number}`"
              :value="number"
              class="bg-casino-blue-dark text-gray-200"
            >
              {{ number }}
            </option>
          </select>
          <div
            class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"
          >
            <svg
              class="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              />
            </svg>
          </div>
        </div>

        <div class="text-xs text-gray-500">
          {{ mainNumbers.length }}/{{ FAVORITE_NUMBERS_MAX }} favorite main
          numbers selected
        </div>
      </div>
    </div>

    <!-- Euro Numbers Section -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <label class="text-sm font-medium text-gray-400">
          Favorite Euro Numbers (1-12)
        </label>
        <button
          v-if="euroNumbers.length > 0"
          type="button"
          class="text-xs text-casino-gold hover:text-casino-gold-light underline"
          @click="clearFavorites('euro')"
        >
          Clear All
        </button>
      </div>

      <div class="space-y-3">
        <!-- Selected Numbers Display -->
        <div v-if="euroNumbers.length > 0" class="flex flex-wrap gap-2">
          <span
            v-for="number in euroNumbers"
            :key="`euro-${number}`"
            class="inline-flex items-center gap-1 px-3 py-1 bg-casino-gold/20 border border-casino-gold/50 rounded-full text-sm font-medium text-casino-gold"
          >
            {{ number }}
            <button
              type="button"
              class="hover:text-casino-gold-light transition-colors"
              @click="removeFavorite('euro', number)"
            >
              ✕
            </button>
          </span>
        </div>

        <!-- Add Number Dropdown -->
        <div v-if="euroNumbers.length < FAVORITE_NUMBERS_MAX" class="relative">
          <select
            :value="''"
            class="w-full px-3 py-2 border border-casino-blue-light/50 bg-casino-blue rounded-md focus:outline-none focus:ring-2 focus:ring-casino-gold focus:border-casino-gold text-gray-200 appearance-none cursor-pointer"
            @change="addEuroNumber($event)"
          >
            <option value="" disabled class="bg-casino-blue-dark text-gray-400">
              Select a Euro number to add...
            </option>
            <option
              v-for="number in availableEuroNumbers"
              :key="`euro-option-${number}`"
              :value="number"
              class="bg-casino-blue-dark text-gray-200"
            >
              {{ number }}
            </option>
          </select>
          <div
            class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"
          >
            <svg
              class="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              />
            </svg>
          </div>
        </div>

        <div class="text-xs text-gray-500">
          {{ euroNumbers.length }}/{{ FAVORITE_NUMBERS_MAX }} favorite Euro
          numbers selected
        </div>
      </div>
    </div>

    <!-- Info Message -->
    <div class="text-xs text-gray-500 bg-casino-blue/40 p-3 rounded-md">
      <strong>💡 How it works:</strong> Your favorite numbers will be
      prioritized during ticket generation, combined with the weighted algorithm
      for remaining slots. This gives your preferred numbers a higher chance of
      being selected while maintaining statistical balance.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  MAIN_NUMBER_MIN,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MIN,
  EURO_NUMBER_MAX,
  FAVORITE_NUMBERS_MAX,
} from '~/utils/constants'

// Store access
const ticketsStore = useTicketsStore()

// Computed properties for favorite numbers
const mainNumbers = computed(
  () => ticketsStore.state.config.favoriteNumbers?.mainNumbers || []
)

const euroNumbers = computed(
  () => ticketsStore.state.config.favoriteNumbers?.euroNumbers || []
)

// Available numbers (excluding already selected ones)
const availableMainNumbers = computed(() => {
  const selected = new Set(mainNumbers.value)
  return Array.from(
    { length: MAIN_NUMBER_MAX - MAIN_NUMBER_MIN + 1 },
    (_, i) => i + MAIN_NUMBER_MIN
  ).filter((num) => !selected.has(num))
})

const availableEuroNumbers = computed(() => {
  const selected = new Set(euroNumbers.value)
  return Array.from(
    { length: EURO_NUMBER_MAX - EURO_NUMBER_MIN + 1 },
    (_, i) => i + EURO_NUMBER_MIN
  ).filter((num) => !selected.has(num))
})

// Event handlers
const addMainNumber = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const number = Number.parseInt(target.value, 10)
  if (!Number.isNaN(number)) {
    ticketsStore.addFavoriteNumber('main', number)
    target.value = '' // Reset dropdown
  }
}

const addEuroNumber = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const number = Number.parseInt(target.value, 10)
  if (!Number.isNaN(number)) {
    ticketsStore.addFavoriteNumber('euro', number)
    target.value = '' // Reset dropdown
  }
}

const removeFavorite = (type: 'main' | 'euro', number: number) => {
  ticketsStore.removeFavoriteNumber(type, number)
}

const clearFavorites = (type: 'main' | 'euro') => {
  ticketsStore.clearFavoriteNumbers(type)
}
</script>

<style scoped>
/* Remove default select styling */
select {
  background-image: none;
}

/* Custom dropdown arrow is handled by the SVG in template */
</style>
