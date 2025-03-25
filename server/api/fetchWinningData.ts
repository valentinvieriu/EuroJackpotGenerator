import { H3Error, createError } from 'h3';
import { generateEurojackpotUrl } from '~/utils/dateUtils';

export default defineEventHandler(async (event) => {
  try {
    const url = generateEurojackpotUrl('previous');
    console.log('Fetching winning data from:', url);

    const response = await fetch(url, { 
      headers: { Accept: 'application/json' },
      timeout: 10000 // 10 seconds timeout
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      // Attempt to read and log the error response body
      const errorBody = await response.text();
      console.error('Error response body:', errorBody);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Winning data fetched successfully');
    return data;
  } catch (error) {
    console.error('Error fetching winning data:', error);
    
    // Implement fallback mechanism
    const fallbackData = getFallbackWinningData();
    console.log('Using fallback winning data');
    
    return fallbackData;
  }
});

import type { EurojackpotHistoricOdds } from "~/types/winning";

function getFallbackWinningData(): EurojackpotHistoricOdds {
  // Provide somewhat realistic, but clearly marked, fallback odds
  // These are just placeholders and don't reflect actual prize amounts
  const fallbackDate = new Date();
  return {
    eurojackpotGameCycle: {
      cycleNo: 0,
      cycleYear: fallbackDate.getFullYear(),
      eventDate: fallbackDate.getTime(),
      eventWeekday: fallbackDate.getDay(),
      gametableValidFrom: null,
      gametableValidTo: null,
      key: "fallback-data",
      variantNo: 0,
    },
    eurojackpotOdds: [
      { amount: 10000000.00, numberOfWins: 0, winningClass: 1, sequence: 1, jackpot: true },
      { amount: 750000.00, numberOfWins: 0, winningClass: 2, sequence: 2, jackpot: false },
      { amount: 100000.00, numberOfWins: 0, winningClass: 3, sequence: 3, jackpot: false },
      { amount: 5000.00, numberOfWins: 0, winningClass: 4, sequence: 4, jackpot: false },
      { amount: 300.00, numberOfWins: 0, winningClass: 5, sequence: 5, jackpot: false },
      { amount: 100.00, numberOfWins: 0, winningClass: 6, sequence: 6, jackpot: false },
      { amount: 50.00, numberOfWins: 0, winningClass: 7, sequence: 7, jackpot: false },
      { amount: 20.00, numberOfWins: 0, winningClass: 8, sequence: 8, jackpot: false },
      { amount: 15.00, numberOfWins: 0, winningClass: 9, sequence: 9, jackpot: false },
      { amount: 12.00, numberOfWins: 0, winningClass: 10, sequence: 10, jackpot: false },
      { amount: 10.00, numberOfWins: 0, winningClass: 11, sequence: 11, jackpot: false },
      { amount: 8.00, numberOfWins: 0, winningClass: 12, sequence: 12, jackpot: false },
    ],
    eurojackpotTurnover: [
      { amount: 0, jurisdiction: 0 }, // Indicate zero turnover for fallback
    ],
  };
}