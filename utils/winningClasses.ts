// Maps matched main numbers and euro numbers to the official winning class (1-12)
export const winningClassesMap: { main: number; euro: number; class: number }[] = [
  { main: 5, euro: 2, class: 1 },
  { main: 5, euro: 1, class: 2 },
  { main: 5, euro: 0, class: 3 },
  { main: 4, euro: 2, class: 4 },
  { main: 4, euro: 1, class: 5 },
  { main: 3, euro: 2, class: 6 },
  { main: 4, euro: 0, class: 7 },
  { main: 2, euro: 2, class: 8 },
  { main: 3, euro: 1, class: 9 },
  { main: 3, euro: 0, class: 10 },
  { main: 1, euro: 2, class: 11 },
  { main: 2, euro: 1, class: 12 },
];

/**
 * Determines the winning class based on matched main and euro numbers.
 * Returns the class number or undefined if not a winner.
 */
// utils/winningClasses.ts
export function determineWinClass(matchedMain: number, matchedEuro: number): number | undefined {
    const win = winningClassesMap.find(
      (wc) => wc.main === matchedMain && wc.euro === matchedEuro
    );
    return win?.class; // Returns 1-12 or undefined
  }
  