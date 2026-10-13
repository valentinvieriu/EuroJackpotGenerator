import { describe, it, expect } from 'vitest'
import {
  createSimulationEngine,
  runSimulation,
  type SimulationSnapshot,
} from '../simulationEngine'
import { buildTicketHighlightUpdate } from '../ticketHighlighting'
import { getPrizeClass } from '../prizeTable'
import {
  AUTOPLAY_CHART_POINTS,
  SIMULATION_PROGRESS_INTERVAL_MS,
} from '../constants'
import type { BatchSimulationRequest, Ticket } from '~/schemas'

// One prize per class, jackpot first
const PRIZES = [
  10_000_000, 500_000, 100_000, 4_000, 250, 120, 80, 25.5, 19.3, 17.1, 10.2,
  8.4,
]
const payouts = Object.fromEntries(PRIZES.map((amount, i) => [i + 1, amount]))

const plainTicket: Ticket = {
  id: 1,
  mainNumbers: [3, 11, 24, 37, 50],
  euroNumbers: [2, 9],
}

// Different systems side by side, with numbers on both sides of the 32/33 word boundary
const mixedTickets: Ticket[] = [
  plainTicket,
  { id: 2, mainNumbers: [1, 2, 32, 33, 34, 49], euroNumbers: [1, 2, 12] },
  {
    id: 3,
    mainNumbers: [5, 10, 15, 20, 25, 30, 35, 40, 45],
    euroNumbers: [3, 6, 9, 12],
  },
  { id: 4, mainNumbers: [31, 32, 33, 34, 35], euroNumbers: [11, 12] },
]

const request = (
  overrides: Partial<BatchSimulationRequest> = {}
): BatchSimulationRequest => ({
  tickets: mixedTickets,
  simulationCount: 1000,
  seed: 'test-seed',
  payouts,
  recordDraws: false,
  ...overrides,
})

const play = (overrides: Partial<BatchSimulationRequest> = {}) => {
  const req = request(overrides)
  const engine = createSimulationEngine(req)
  engine.run(req.simulationCount)
  return engine
}

describe('simulation engine', () => {
  it('replays the same run for the same seed', () => {
    expect(play().result()).toEqual(play().result())
    expect(play().trajectory()).toEqual(play().trajectory())
  })

  it('gives a different run for a different seed', () => {
    const a = play({ recordDraws: true }).result()
    const b = play({ recordDraws: true, seed: 'other-seed' }).result()
    expect(a.individualResults).not.toEqual(b.individualResults)
    expect(a.seed).toBe('test-seed')
    expect(b.seed).toBe('other-seed')
  })

  it('does not depend on how the run is sliced', () => {
    const sliced = createSimulationEngine(request())
    while (sliced.draws < 1000) sliced.run(7)
    expect(sliced.draws).toBe(1000)
    expect(sliced.result()).toEqual(play().result())
    expect(sliced.trajectory()).toEqual(play().trajectory())
  })

  it('stops at the end of the run', () => {
    const engine = createSimulationEngine(request({ simulationCount: 100 }))
    engine.run(1_000_000)
    expect(engine.draws).toBe(100)
    expect(engine.result().totalSimulations).toBe(100)
  })

  it('draws valid EuroJackpot numbers', () => {
    const { individualResults } = play({ recordDraws: true }).result()
    expect(individualResults).toHaveLength(1000)

    const seenMain = new Set<number>()
    individualResults!.forEach((draw, index) => {
      const { mainNumbers, euroNumbers } = draw.winningNumbers
      expect(draw.simulationIndex).toBe(index)
      expect(new Set(mainNumbers).size).toBe(5)
      expect(new Set(euroNumbers).size).toBe(2)
      expect(Math.min(...mainNumbers)).toBeGreaterThanOrEqual(1)
      expect(Math.max(...mainNumbers)).toBeLessThanOrEqual(50)
      expect(Math.min(...euroNumbers)).toBeGreaterThanOrEqual(1)
      expect(Math.max(...euroNumbers)).toBeLessThanOrEqual(12)
      mainNumbers.forEach((n) => seenMain.add(n))
    })
    expect(seenMain.size).toBe(50)
  })

  it('keeps no individual draws unless asked to', () => {
    expect(play().result().individualResults).toBeUndefined()
  })

  it('totals agree with scoring every draw one by one', () => {
    const result = play({ recordDraws: true }).result()
    const draws = result.individualResults!
    const stake = (1 + 6 * 3 + 126 * 6 + 1) * 2 // lines of the four tickets × €2

    expect(result.stakePerPlay).toBe(stake)
    expect(result.totalCost).toBe(stake * 1000)

    const totalCents = draws.reduce(
      (sum, d) => sum + Math.round(d.totalWinnings * 100),
      0
    )
    expect(Math.round(result.totalWinnings * 100)).toBe(totalCents)
    expect(result.winDistribution.totalWins).toBe(
      draws.filter((d) => d.totalWinnings > 0).length
    )
    expect(result.statistics.maxWinnings).toBe(
      Math.max(...draws.map((d) => d.totalWinnings))
    )
    expect(result.statistics.profitableSimulations).toBe(
      draws.filter((d) => d.netProfit >= 0).length
    )

    // Percentiles from the payout counts equal percentiles over every draw
    const sorted = draws.map((d) => d.totalWinnings).sort((a, b) => a - b)
    const middle = (sorted[499]! + sorted[500]!) / 2
    expect(result.statistics.medianWinnings).toBeCloseTo(middle, 6)

    for (let cls = 1; cls <= 12; cls++) {
      const expected = draws.reduce(
        (sum, d) => sum + (d.winsByClass[cls] ?? 0),
        0
      )
      expect(result.winDistribution.winsByClass[cls]).toBe(expected)
    }
  })

  it('per-ticket highlights agree with matching every draw one by one', () => {
    const result = play({ recordDraws: true }).result()
    const stats = result.highlightingData!.ticketStats

    for (const ticket of mixedTickets) {
      const expected = {
        mainNumberFrequency: {} as Record<string, number>,
        euroNumberFrequency: {} as Record<string, number>,
        winClassCounts: {} as Record<string, number>,
        totalWins: 0,
      }
      for (const draw of result.individualResults!) {
        const update = buildTicketHighlightUpdate(
          ticket,
          draw.winningNumbers.mainNumbers,
          draw.winningNumbers.euroNumbers
        )
        if (Object.keys(update.winClassCounts).length === 0) continue
        expected.totalWins++
        for (const n of update.winningMainNumbers) {
          expected.mainNumberFrequency[n] =
            (expected.mainNumberFrequency[n] ?? 0) + 1
        }
        for (const n of update.winningEuroNumbers) {
          expected.euroNumberFrequency[n] =
            (expected.euroNumberFrequency[n] ?? 0) + 1
        }
        for (const [cls, lines] of Object.entries(update.winClassCounts)) {
          expected.winClassCounts[cls] =
            (expected.winClassCounts[cls] ?? 0) + lines
        }
      }
      expect(stats[ticket.id]).toEqual(expected)
      expect(expected.totalWins).toBeGreaterThan(0)
    }
  })

  it('hits each prize class about as often as the odds say', () => {
    const draws = 400_000
    const result = play({
      tickets: [plainTicket],
      simulationCount: draws,
    }).result()

    // The four most common classes: enough hits for a tight check
    for (const cls of [12, 11, 10, 9]) {
      const probability = getPrizeClass(cls)!.probability
      const expected = draws * probability
      const sigma = Math.sqrt(draws * probability * (1 - probability))
      const hits = result.winDistribution.winsByClass[cls]!
      expect(Math.abs(hits - expected)).toBeLessThan(4 * sigma)
    }
  })

  it('records an evenly spaced trajectory that ends on the final totals', () => {
    const engine = play({ simulationCount: 1030 })
    const result = engine.result()
    const trajectory = engine.trajectory()

    // One point every ceil(1030 / 50) = 21 draws, plus the last draw
    expect(trajectory).toHaveLength(AUTOPLAY_CHART_POINTS)
    expect(trajectory[0]!.draws).toBe(21)
    expect(trajectory[1]!.draws).toBe(42)
    expect(trajectory.at(-1)).toEqual({
      draws: 1030,
      spent: result.totalCost,
      won: result.totalWinnings,
    })
    for (let i = 1; i < trajectory.length; i++) {
      expect(trajectory[i]!.won).toBeGreaterThanOrEqual(trajectory[i - 1]!.won)
    }
  })

  it('snapshots report where the run stands', () => {
    const engine = createSimulationEngine(request())
    engine.run(400)
    const snapshot = engine.snapshot()
    expect(snapshot.draws).toBe(400)
    expect(snapshot.totalDraws).toBe(1000)
    expect(snapshot.totalCost).toBe(400 * 1552)
    expect(snapshot.hits).toBeGreaterThan(0)
    expect(snapshot.hits).toBeLessThanOrEqual(400)
    expect(snapshot.maxWin).toBeLessThanOrEqual(snapshot.totalWinnings)
    expect(snapshot.trajectory.at(-1)!.draws).toBe(400)
  })
})

describe('runSimulation', () => {
  it('returns the same outcome as driving the engine by hand', () => {
    const outcome = runSimulation(request(), () => {})
    const engine = play()
    expect(outcome.result).toEqual(engine.result())
    expect(outcome.trajectory).toEqual(engine.trajectory())
  })

  it('reports progress no more often than the interval allows', () => {
    // A clock that jumps one full interval every time it is read
    let clock = 0
    const now = () => (clock += SIMULATION_PROGRESS_INTERVAL_MS)
    const snapshots: SimulationSnapshot[] = []

    runSimulation(
      request({ simulationCount: 5000 }),
      (snapshot) => snapshots.push(snapshot),
      now
    )

    // 5 slices of 1000 draws; the last one ends the run and is not reported
    expect(snapshots.map((s) => s.draws)).toEqual([1000, 2000, 3000, 4000])
  })

  it('stays silent when the run finishes within one interval', () => {
    const snapshots: SimulationSnapshot[] = []
    runSimulation(
      request(),
      (snapshot) => snapshots.push(snapshot),
      () => 0
    )
    expect(snapshots).toHaveLength(0)
  })
})
