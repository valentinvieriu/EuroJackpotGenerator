import { describe, it, expect } from 'vitest'
import { calculateTotalWinnings } from '../winningManager'

describe('winningManager', () => {
  it('sums winnings from winClassCounts and winClass', () => {
    const odds = {
      eurojackpotGameCycle: {
        cycleNo: 1, cycleYear: 2025, eventDate: Date.now(), eventWeekday: 5,
        gametableValidFrom: null, gametableValidTo: null, key: 'x', variantNo: 1
      },
      eurojackpotOdds: [
        { amount: 100, numberOfWins: 0, winningClass: 10, sequence: 10, jackpot: false },
        { amount: 500, numberOfWins: 0, winningClass: 5, sequence: 5, jackpot: false },
      ],
      eurojackpotTurnover: [{ amount: 0, jurisdiction: 0 }],
    }
    const tickets = [
      { id: 1, mainNumbers: [], euroNumbers: [], winClassCounts: { 10: 2 } },
      { id: 2, mainNumbers: [], euroNumbers: [], winClass: 5 },
    ] as any
    const total = calculateTotalWinnings(tickets, odds as any)
    expect(total).toBe(2*100 + 500)
  })

  it('returns 0 when no odds available', () => {
    const total = calculateTotalWinnings([{ id: 1, mainNumbers: [], euroNumbers: [] }] as any, null as any)
    expect(total).toBe(0)
  })
})