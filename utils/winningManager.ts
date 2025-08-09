import type { EurojackpotHistoricOdds } from '~/types/winning';
import { determineWinClass } from './winningClasses';
import type { Ticket } from '~/types/ticket';

let cachedWinningData: EurojackpotHistoricOdds | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function fetchLatestWinningData(): Promise<EurojackpotHistoricOdds | null> {
  const now = Date.now();
  if (cachedWinningData && now - lastFetchTime < CACHE_DURATION) {
    return cachedWinningData;
  }

  const url = generateNearestEurojackpotUrl();

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!response.ok) {
      throw new Error('Failed to fetch winning data');
    }

    const data: EurojackpotHistoricOdds = await response.json();
    cachedWinningData = data;
    lastFetchTime = now;
    return data;
  } catch (error) {
    console.error('Error fetching winning data:', error);
    return null;
  }
}

function generateNearestEurojackpotUrl() {
  const baseUrl = "https://www.lotto-bayern.de/getEurojackpotHistoricOdds?gckey=";

  // Get the current date
  const today = new Date();

  // Helper function to get the next draw date (Tuesday or Friday)
  function getNextDrawDate(date: Date): Date {
    const dayOfWeek = date.getDay();
    const drawDays = [2, 5]; // Tuesday and Friday

    // Calculate days until next draw day
    const daysUntilNextDraw = drawDays
      .map(drawDay => (drawDay - dayOfWeek + 7) % 7 || 7)
      .sort((a, b) => a - b)[0];

    const nextDrawDate = new Date(date);
    nextDrawDate.setDate(date.getDate() + daysUntilNextDraw);
    return nextDrawDate;
  }

  // Function to get ISO week number
  function getISOWeekNumber(date: Date): number {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.getTime();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    // 604800000 = 7 * 24 * 60 * 60 * 1000 milliseconds in a week
    const MILLISECONDS_IN_WEEK = 7 * 24 * 60 * 60 * 1000;
    const weekNumber = 1 + Math.ceil((firstThursday - target.getTime()) / MILLISECONDS_IN_WEEK);
    return weekNumber;
  }

  const nextDrawDate = getNextDrawDate(today);
  const weekNumber = getISOWeekNumber(nextDrawDate);
  const year = nextDrawDate.getFullYear();
  const drawDay = nextDrawDate.getDay(); // 2 for Tuesday, 5 for Friday

  const gckey = `${year}-${weekNumber}-${drawDay}`;
  const fullUrl = `${baseUrl}${gckey}`;

  return fullUrl;
}

export function calculateTotalWinnings(tickets: Ticket[], winningData: EurojackpotHistoricOdds): number {
  let totalWinnings = 0;
  tickets.forEach(ticket => {
    if (ticket.winClass) {
      const winningClass = winningData.eurojackpotOdds.find(odd => odd.winningClass === ticket.winClass);
      if (winningClass) {
        totalWinnings += winningClass.amount;
      }
    }
  });
  return totalWinnings;
}
