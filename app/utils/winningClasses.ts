// utils/winningClasses.ts

/**
 * Defines the official EuroJackpot winning classes based on the number of matched
 * main numbers and euro numbers.
 * `class`: Represents the official winning class tier (1 is the jackpot, 12 is the lowest).
 */
export const winningClassesMap: ReadonlyArray<{ main: number; euro: number; class: number }> = [
  { main: 5, euro: 2, class: 1 }, // Jackpot
  { main: 5, euro: 1, class: 2 },
  { main: 5, euro: 0, class: 3 },
  { main: 4, euro: 2, class: 4 },
  { main: 4, euro: 1, class: 5 },
  { main: 3, euro: 2, class: 6 },
  { main: 4, euro: 0, class: 7 }, // Note the order difference vs. class number
  { main: 2, euro: 2, class: 8 },
  { main: 3, euro: 1, class: 9 },
  { main: 3, euro: 0, class: 10 },
  { main: 1, euro: 2, class: 11 },
  { main: 2, euro: 1, class: 12 }, // Lowest winning class
] as const; // Use 'as const' for stricter typing if needed, though ReadonlyArray is good

/**
 * Determines the winning class (1-12) for a ticket based on the count of matched
 * main numbers and matched euro numbers.
 *
 * @param matchedMain The count of main numbers matched against the winning draw.
 * @param matchedEuro The count of euro numbers matched against the winning draw.
 * @returns The corresponding winning class number (1-12) if the combination matches
 *          a winning tier, otherwise returns `undefined`.
 */
export function determineWinClass(matchedMain: number, matchedEuro: number): number | undefined {
  // Find the entry in the map where the main and euro counts match the input.
  const win = winningClassesMap.find(
    (wc) => wc.main === matchedMain && wc.euro === matchedEuro
  );

  // Return the 'class' number if a match was found, otherwise return undefined.
  return win?.class;
}