import { describe, it, expect } from 'vitest'
import { scoreDraw } from '~/utils/drawScoring'
import type { Ticket, EurojackpotHistoricOdds } from '~/schemas'

const DRAW = { mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] }

const ticket = (
  id: number,
  mainNumbers: number[],
  euroNumbers: number[],
  linesCount = 1
): Ticket => ({ id, mainNumbers, euroNumbers, linesCount })

const odds = (amounts: Record<number, number>) =>
  ({
    eurojackpotOdds: Object.entries(amounts).map(([winningClass, amount]) => ({
      winningClass: Number(winningClass),
      amount,
    })),
  }) as unknown as EurojackpotHistoricOdds

describe('scoreDraw', () => {
  it('finds the matching numbers and the win class of each ticket', () => {
    const score = scoreDraw(
      [
        ticket(1, [1, 2, 30, 31, 32], [1, 9]), // 2 + 1 → class 12
        ticket(2, [40, 41, 42, 43, 44], [10, 11]), // nothing
      ],
      DRAW,
      odds({ 12: 10 })
    )

    expect(score.ticketHighlights[0]).toMatchObject({
      id: 1,
      winningMainNumbers: [1, 2],
      winningEuroNumbers: [1],
      winClass: 12,
      winClassCounts: { 12: 1 },
    })
    expect(score.ticketHighlights[1]).toMatchObject({
      id: 2,
      winningMainNumbers: [],
      winningEuroNumbers: [],
      winClassCounts: {},
    })
    expect(score.ticketHighlights[1]?.winClass).toBeUndefined()
  })

  it('adds up winnings, stake, net and ROI', () => {
    const score = scoreDraw(
      [
        ticket(1, [1, 2, 30, 31, 32], [1, 9]),
        ticket(2, [1, 2, 3, 40, 41], [5, 6]),
      ],
      DRAW,
      odds({ 12: 10, 10: 18.7 }) // 2 + 1 and 3 + 0
    )

    expect(score.stake).toBe(4)
    expect(score.totalWinnings).toBe(28.7)
    expect(score.netProfit).toBe(24.7)
    expect(score.roiPercentage).toBeCloseTo(617.5, 5)
  })

  it('reports a full loss when nothing matches', () => {
    const score = scoreDraw(
      [ticket(1, [40, 41, 42, 43, 44], [10, 11])],
      DRAW,
      odds({ 12: 10 })
    )

    expect(score.totalWinnings).toBe(0)
    expect(score.netProfit).toBe(-2)
    expect(score.roiPercentage).toBe(-100)
  })

  it('counts every winning line of a system ticket', () => {
    // 6 main numbers of which 3 are drawn, plus both euro numbers:
    // 3 lines hit 3 + 2 (class 6) and 3 lines hit 2 + 2 (class 8)
    const score = scoreDraw(
      [ticket(1, [1, 2, 3, 40, 41, 42], [1, 2], 6)],
      DRAW,
      odds({ 6: 100, 8: 20 })
    )

    expect(score.ticketHighlights[0]?.winClassCounts).toEqual({ 6: 3, 8: 3 })
    expect(score.stake).toBe(12)
    expect(score.totalWinnings).toBe(360)
  })

  it('still finds matches without prize data, but pays nothing', () => {
    const score = scoreDraw([ticket(1, [1, 2, 30, 31, 32], [1, 9])], DRAW, null)

    expect(score.ticketHighlights[0]?.winClass).toBe(12)
    expect(score.totalWinnings).toBe(0)
    expect(score.netProfit).toBe(-2)
  })

  it('handles an empty ticket list', () => {
    const score = scoreDraw([], DRAW, odds({ 12: 10 }))

    expect(score).toEqual({
      ticketHighlights: [],
      stake: 0,
      totalWinnings: 0,
      netProfit: 0,
      roiPercentage: 0,
    })
  })

  it('gives the same answer every time for the same tickets and draw', () => {
    const tickets = [ticket(1, [1, 2, 3, 4, 44], [1, 2])]
    const prizes = odds({ 4: 5252.7 })

    expect(scoreDraw(tickets, DRAW, prizes)).toEqual(
      scoreDraw(tickets, DRAW, prizes)
    )
    expect(scoreDraw(tickets, DRAW, prizes).totalWinnings).toBe(5252.7)
  })
})
