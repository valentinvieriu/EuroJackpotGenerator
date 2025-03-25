<template>
  <div>
    <div class="bg-casino-blue-dark rounded-lg shadow-xl p-6 mb-8 border border-casino-blue-light/30">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 items-end">
        <div>
          <label for="ticketType" class="mb-2 block text-gray-400 text-sm font-medium">Ticket Type:</label>
          <select
            id="ticketType"
            v-model="selectedTicketType"
            class="w-full px-3 py-2 border border-casino-blue-light/50 bg-casino-blue rounded-md focus:outline-none focus:ring-2 focus:ring-casino-gold focus:border-casino-gold text-gray-200"
            aria-label="Ticket Type"
          >
            <option v-for="type in ticketTypes" :key="type.label" :value="type" class="bg-casino-blue-dark text-gray-200">
              {{ type.label }} (€{{ type.price.toFixed(2) }})
            </option>
          </select>
        </div>
        <div>
          <label for="ticketCount" class="mb-2 block text-gray-400 text-sm font-medium">Number of Tickets:</label>
          <input
            type="number"
            id="ticketCount"
            v-model.number="ticketCount"
            min="1"
            class="w-full px-3 py-2 border border-casino-blue-light/50 bg-casino-blue rounded-md focus:outline-none focus:ring-2 focus:ring-casino-gold focus:border-casino-gold text-gray-200"
            aria-label="Number of Tickets"
          />
        </div>
        <div class="text-right sm:text-left">
           <label class="mb-2 block text-gray-400 text-sm font-medium">Total Price:</label>
          <div class="flex items-center justify-end sm:justify-start">
            <span class="text-xl font-semibold text-casino-gold-light">€{{ totalPrice.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- Add Total Winnings Display -->
      <div v-if="simulationResult" class="mb-6 text-right sm:text-left">
         <label class="mb-2 block text-gray-400 text-sm font-medium">Total Winnings:</label>
         <div class="flex items-center justify-end sm:justify-start">
            <span class="text-xl font-semibold text-casino-gold">€{{ totalWinnings.toFixed(2) }}</span>
          </div>
      </div>

       <!-- Add Win/Loss Rate Display -->
       <div v-if="simulationResult && winLossRate !== null" class="mb-6 text-right sm:text-left">
         <label class="mb-2 block text-gray-400 text-sm font-medium">Win/Loss Rate:</label>
         <div class="flex items-center justify-end sm:justify-start">
            <span :class="[
                'text-xl font-semibold',
                 winLossRate >= 0 ? 'text-green-400' : 'text-red-400'
                 ]">
                {{ winLossRate >= 0 ? '+' : '' }}{{ winLossRate.toFixed(2) }}%
            </span>
          </div>
      </div>

      <div class="flex flex-col sm:flex-row justify-end gap-3 mt-4">
        <button
          @click="generateTickets"
          :disabled="loading"
          class="bg-casino-gold text-casino-blue-dark px-5 py-2 rounded-md font-semibold hover:bg-casino-gold-light focus:outline-none focus:ring-2 focus:ring-casino-gold focus:ring-offset-2 focus:ring-offset-casino-blue-dark disabled:opacity-50 transition duration-150"
        >
          Generate Tickets
        </button>
        <button
          @click="simulateExtraction"
          :disabled="loading || tickets.length === 0"
          class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2 rounded-md font-semibold hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-casino-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
        >
          Simulate Extraction
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center text-gray-400 my-8">
      <svg class="animate-spin h-8 w-8 text-casino-gold-light mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="mt-2">Processing...</p>
    </div>
    <div v-else-if="error" class="text-center text-red-400 bg-red-900/50 border border-red-500 p-4 rounded-md my-6">{{ error }}</div>

    <SimulationResult v-if="simulationResult" :result="simulationResult" />

    <div v-if="tickets.length && !loading" class="space-y-4">
       <h2 v-if="!simulationResult" class="text-2xl font-semibold text-gray-300 mb-4">Generated Tickets ({{ tickets.length }})</h2>
       <h2 v-else class="text-2xl font-semibold text-gray-300 mb-4">Results ({{ tickets.length }} Tickets)</h2>
       <TicketComponent
          v-for="ticket in tickets"
          :key="ticket.id"
          :ticket="ticket"
          :ticket-number="ticket.id"
        />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRuntimeConfig } from '#app'
import type { Ticket } from '~/types/ticket'
import SimulationResult from './SimulationResult.vue'
import TicketComponent from './Ticket.vue'
// Keep existing winningManager and winningClasses imports
import { calculateTotalWinnings } from '~/utils/winningManager'
import { determineWinClass } from '~/utils/winningClasses'
import type { EurojackpotHistoricOdds } from '~/types/winning';


interface TicketType {
  label: string
  mainCount: number
  euroCount: number
  price: number
}

// Ticket Types remain the same
const ticketTypes: TicketType[] = [
  { label: 'System 5/2', mainCount: 5, euroCount: 2, price: 2.00 },
  { label: 'System 5/3', mainCount: 5, euroCount: 3, price: 6.00 },
  { label: 'System 5/4', mainCount: 5, euroCount: 4, price: 12.00 },
  { label: 'System 5/5', mainCount: 5, euroCount: 5, price: 20.00 },
  { label: 'System 5/6', mainCount: 5, euroCount: 6, price: 30.00 },
  { label: 'System 5/7', mainCount: 5, euroCount: 7, price: 42.00 },
  { label: 'System 5/8', mainCount: 5, euroCount: 8, price: 56.00 },
  { label: 'System 5/9', mainCount: 5, euroCount: 9, price: 72.00 },
  { label: 'System 5/10', mainCount: 5, euroCount: 10, price: 90.00 },
  { label: 'System 5/11', mainCount: 5, euroCount: 11, price: 110.00 },
  { label: 'System 5/12', mainCount: 5, euroCount: 12, price: 132.00 },
  { label: 'System 6/2', mainCount: 6, euroCount: 2, price: 12.00 },
  { label: 'System 6/3', mainCount: 6, euroCount: 3, price: 36.00 },
  { label: 'System 6/4', mainCount: 6, euroCount: 4, price: 72.00 },
  { label: 'System 6/5', mainCount: 6, euroCount: 5, price: 120.00 },
  { label: 'System 6/6', mainCount: 6, euroCount: 6, price: 180.00 },
  { label: 'System 6/7', mainCount: 6, euroCount: 7, price: 252.00 },
  { label: 'System 6/8', mainCount: 6, euroCount: 8, price: 336.00 },
  { label: 'System 6/9', mainCount: 6, euroCount: 9, price: 432.00 },
  { label: 'System 6/10', mainCount: 6, euroCount: 10, price: 540.00 },
  { label: 'System 6/11', mainCount: 6, euroCount: 11, price: 660.00 },
  { label: 'System 6/12', mainCount: 6, euroCount: 12, price: 792.00 },
  { label: 'System 7/2', mainCount: 7, euroCount: 2, price: 42.00 },
  { label: 'System 7/3', mainCount: 7, euroCount: 3, price: 126.00 },
  { label: 'System 7/4', mainCount: 7, euroCount: 4, price: 252.00 },
  { label: 'System 7/5', mainCount: 7, euroCount: 5, price: 420.00 },
  { label: 'System 7/6', mainCount: 7, euroCount: 6, price: 630.00 },
  { label: 'System 7/7', mainCount: 7, euroCount: 7, price: 882.00 },
  { label: 'System 7/8', mainCount: 7, euroCount: 8, price: 1176.00 },
  { label: 'System 8/2', mainCount: 8, euroCount: 2, price: 112.00 },
  { label: 'System 8/3', mainCount: 8, euroCount: 3, price: 336.00 },
  { label: 'System 8/4', mainCount: 8, euroCount: 4, price: 672.00 },
  { label: 'System 8/5', mainCount: 8, euroCount: 5, price: 1120.00 },
  { label: 'System 9/2', mainCount: 9, euroCount: 2, price: 252.00 },
  { label: 'System 9/3', mainCount: 9, euroCount: 3, price: 756.00 },
  { label: 'System 10/2', mainCount: 10, euroCount: 2, price: 504.00 },
  { label: 'System 11/2', mainCount: 11, euroCount: 2, price: 924.00 },
]

const selectedTicketType = ref<TicketType>(ticketTypes[0])
const ticketCount = ref<number>(1)
const totalPrice = computed(() => selectedTicketType.value.price * ticketCount.value)

const tickets = ref<Ticket[]>([])
const loading = ref(false)
const error = ref('')
const simulationResult = ref<Ticket | null>(null)
const totalWinnings = ref<number>(0)
const winLossRate = ref<number | null>(null) // Added for win/loss rate %
const latestWinningData = ref<EurojackpotHistoricOdds | null>(null);


const config = useRuntimeConfig()

const generateTickets = async () => {
  loading.value = true;
  error.value = '';
  tickets.value = [];
  totalWinnings.value = 0;
  simulationResult.value = null; // Reset simulation result
  latestWinningData.value = null; // Reset winning data

  try {
    // Expect the API to return an array of Ticket objects directly on success
    const response = await $fetch<Ticket[]>(`${config.public.apiBase}/generate`, {
      method: 'POST',
      body: {
        ticketCount: ticketCount.value,
        mainCount: selectedTicketType.value.mainCount,
        euroCount: selectedTicketType.value.euroCount
      }
    });

    // If $fetch is successful (doesn't throw), the response is the array
    tickets.value = response;

  } catch (err: any) {
    // $fetch throws an error for non-2xx responses or network issues
    console.error('Error generating tickets:', err);
    // Try to get a meaningful error message from the response data if available
    const errorResponseMessage = err.data?.message || err.data?.statusMessage || err.message;
    error.value = errorResponseMessage || 'Failed to generate tickets. Check server logs.';
  } finally {
    loading.value = false;
  }
};

const simulateExtraction = async () => {
  if (tickets.value.length === 0) {
    error.value = 'Please generate tickets before simulating.';
    return;
  }
  loading.value = true;
  error.value = '';
  simulationResult.value = null;
  totalWinnings.value = 0;
  latestWinningData.value = null;

  try {
     // Fetch simulation result AND latest official winning odds in parallel
    const [simResponse, winDataResponse] = await Promise.all([
      $fetch<Ticket>(`${config.public.apiBase}/simulate`),
      $fetch<EurojackpotHistoricOdds>(`${config.public.apiBase}/fetchWinningData`)
    ]);

    simulationResult.value = simResponse;

    // --- Normalization START ---
    // Check if winDataResponse and its odds exist before transforming
    if (winDataResponse?.eurojackpotOdds) {
      const normalizedOddsData = {
        ...winDataResponse,
        eurojackpotOdds: winDataResponse.eurojackpotOdds.map(odd => ({
          ...odd,
          // Subtract 100 to normalize 101-112 down to 1-12
          winningClass: odd.winningClass - 100
        }))
      };
      latestWinningData.value = normalizedOddsData;
    } else {
      // Handle cases where winData might be missing or malformed (e.g., using fallback)
      latestWinningData.value = winDataResponse; // Use as is, calculation might use fallback or fail gracefully
      if (!winDataResponse) {
          console.warn('Could not fetch any winning data (including fallback) for odds calculation.');
      } else if (!winDataResponse.eurojackpotOdds) {
          console.warn('Winning data fetched, but eurojackpotOdds array is missing. Using potentially incomplete data.');
      }
    }
    // --- Normalization END ---


    if (simulationResult.value && latestWinningData.value?.eurojackpotOdds) {
       // Ensure the odds are present for calculation
      checkWinningNumbers(); // Updates tickets with winClass (1-12)
      // calculateTotalWinnings now receives data with winningClass 1-12
      totalWinnings.value = calculateTotalWinnings(tickets.value, latestWinningData.value);
    } else {
       if (!simulationResult.value) throw new Error('Failed to get simulation result.');
       // If odds are missing after normalization attempt, winnings will be 0
       checkWinningNumbers(); // Still check matches even if odds are missing
       totalWinnings.value = 0;
       console.warn('Cannot calculate winnings because normalized odds data is unavailable.');
    }

    // Calculate Win/Loss Rate
    if (totalPrice.value > 0) {
      const profit = totalWinnings.value - totalPrice.value;
      winLossRate.value = (profit / totalPrice.value) * 100;
    } else {
      winLossRate.value = totalWinnings.value > 0 ? Infinity : 0; // Handle zero cost case
    }


  } catch (err: any) {
    console.error('Error during simulation or data fetching:', err);
    error.value = err.data?.message || err.message || 'An error occurred during simulation.';
    // If simulation failed, clear results
    simulationResult.value = null;
    totalWinnings.value = 0;
    winLossRate.value = null; // Reset rate on error
  } finally {
    loading.value = false;

    // Play sound based on winnings vs cost
    // Pass both values to the sound function
    if (simulationResult.value) { // Ensure simulation happened before playing sound
         playWinSound(totalWinnings.value, totalPrice.value);
    }

  }
};

// Function to play a win sound based on winnings vs cost
const playWinSound = (winnings: number, cost: number) => {
  if (winnings <= 0) return; // Don't play if no winnings

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      console.warn("Web Audio API is not supported.");
      return;
    }
    const audioContext = new AudioContext();

    const ratio = cost > 0 ? winnings / cost : Infinity; // Handle zero cost
    const baseFrequency = 330; // E4
    const winFrequency = 880; // A5 (higher pitch for significant wins)
    const maxFrequency = winFrequency * 1.5; // Limit pitch increase
    const duration = 0.25; // seconds per sound
    const delayBetweenRepeats = 0.1; // seconds

    const playTone = (frequency: number, startTime: number, playDuration: number = duration) => {
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'triangle'; // A slightly richer tone
      oscillator.frequency.setValueAtTime(frequency, startTime);

      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.01, startTime); // Start quieter
      gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.05); // Quick swell
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + playDuration); // Fade out

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + playDuration);
    };

    if (ratio < 1 && ratio > 0) {
      // Pitch increases as winnings approach cost
      const pitch = Math.min(baseFrequency + (ratio * (winFrequency - baseFrequency)), maxFrequency);
      playTone(pitch, audioContext.currentTime);
       // Close context after single sound
      setTimeout(() => audioContext.close(), (duration + 0.1) * 1000);
    } else if (ratio >= 1) {
      // Play win sound multiple times based on magnitude
      const repetitions = Math.min(Math.floor(ratio), 10); // Limit repetitions to 10
      let startTime = audioContext.currentTime;
      for (let i = 0; i < repetitions; i++) {
        playTone(winFrequency, startTime);
        startTime += duration + delayBetweenRepeats;
      }
       // Close context after all sounds scheduled
      setTimeout(() => audioContext.close(), startTime * 1000);
    } else {
       // Handle ratio == 0 case (though checked earlier) or other edge cases
        audioContext.close(); // Ensure context is closed if no sound is played
    }

  } catch (e) {
    console.error("Could not play dynamic win sound:", e);
  }
};


const checkWinningNumbers = () => {
  if (!simulationResult.value || tickets.value.length === 0) {
    return;
  }

  tickets.value.forEach(ticket => {
    // Reset previous winning information
    ticket.winningMainNumbers = undefined;
    ticket.winningEuroNumbers = undefined;
    ticket.winClass = undefined;

    const matchedMain = simulationResult.value!.mainNumbers.filter(num => ticket.mainNumbers.includes(num));
    const matchedEuro = simulationResult.value!.euroNumbers.filter(num => ticket.euroNumbers.includes(num));

    const winClass = determineWinClass(matchedMain.length, matchedEuro.length);

    if (winClass) {
      ticket.winClass = winClass;
      // Mark winning numbers for highlighting
      ticket.winningMainNumbers = matchedMain;
      ticket.winningEuroNumbers = matchedEuro;
    } else {
       // Even if not a winning class, show matched numbers
       ticket.winningMainNumbers = matchedMain;
       ticket.winningEuroNumbers = matchedEuro;
    }
  });

  // Sort tickets: winners first, then by win class (lower class number is better)
  tickets.value.sort((a, b) => {
    const winA = a.winClass ?? 999; // Assign high number if no win class
    const winB = b.winClass ?? 999;
    if (winA !== winB) {
      return winA - winB; // Sort by win class ascending
    }
    return a.id - b.id; // Maintain original order for non-winners or same class
  });
};

// Removed fetchLatestWinningData from here, as it's handled by the API endpoint now.
</script>

<style scoped>
/* Add any necessary scoped styles if Tailwind isn't sufficient */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield; /* Firefox */
}
</style>