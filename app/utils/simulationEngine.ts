/**
 * The autoplay (Monte Carlo) engine: plays the same tickets draw after draw
 * and keeps running totals instead of the draws themselves, so a run of
 * millions costs no more memory than a run of hundreds.
 *
 * Everything here is deterministic for a given request, and free of Nuxt and
 * DOM dependencies so it can run inside a Web Worker.
 */

import type {
  BatchSimulationRequest,
  BatchSimulationResult,
  IndividualSimulationResult,
  TicketHighlightingData,
} from '~/schemas'
import { calculateWinningLineCounts } from '~/utils/combinatorics'
import {
  calculateBatchStatistics,
  simulateSingleDraw,
} from '~/utils/batchStatistics'
import { calculateTotalSimulationCost } from '~/utils/simulationMath'
import { Sfc32 } from '~/utils/sfc32'
import {
  MAIN_NUMBER_MIN,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MIN,
  EURO_NUMBER_MAX,
  MAIN_NUMBERS_COUNT,
  EURO_NUMBERS_COUNT,
  AUTOPLAY_CHART_POINTS,
  SIMULATION_SLICE_DRAWS,
  SIMULATION_PROGRESS_INTERVAL_MS,
} from '~/utils/constants'

/** Cumulative money in / money out after a number of draws */
export interface TrajectoryPoint {
  draws: number
  spent: number
  won: number
}

/** Where a run stands part-way through */
export interface SimulationSnapshot {
  draws: number
  totalDraws: number
  totalCost: number
  totalWinnings: number
  /** Draws that paid anything */
  hits: number
  maxWin: number
  winsByClass: Record<number, number>
  trajectory: TrajectoryPoint[]
}

export interface SimulationOutcome {
  result: BatchSimulationResult
  trajectory: TrajectoryPoint[]
}

/** What the simulation worker posts back to the page */
export type SimulationWorkerMessage =
  | { type: 'progress'; snapshot: SimulationSnapshot }
  | ({ type: 'result' } & SimulationOutcome)
  | { type: 'error'; error: string }

export interface SimulationEngine {
  /** Draws played so far */
  readonly draws: number
  /** Play up to `count` more draws, stopping at the end of the run */
  run: (count: number) => void
  snapshot: () => SimulationSnapshot
  result: () => BatchSimulationResult
  trajectory: () => TrajectoryPoint[]
}

// A ticket's numbers as bits: main numbers 1–32 in one word, 33–50 in a second
const WORD_BITS = 32

// A ticket's outcome in a draw is fully described by how many of its main and
// euro numbers came up: one cell per (main matches, euro matches) pair
const EURO_MATCH_STEPS = EURO_NUMBERS_COUNT + 1
const MATCH_CELLS = (MAIN_NUMBERS_COUNT + 1) * EURO_MATCH_STEPS

// Per-ticket counters are indexed by the number itself
const MAIN_SLOTS = MAIN_NUMBER_MAX + 1
const EURO_SLOTS = EURO_NUMBER_MAX + 1

/** Number of set bits in a 32-bit integer */
function bitCount(value: number): number {
  value = value - ((value >>> 1) & 0x55555555)
  value = (value & 0x33333333) + ((value >>> 2) & 0x33333333)
  return Math.imul((value + (value >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24
}

function numberPool(min: number, max: number): Uint8Array {
  return Uint8Array.from({ length: max - min + 1 }, (_, i) => min + i)
}

/**
 * Move `count` randomly chosen numbers to the front of the pool (a partial
 * Fisher–Yates shuffle). Whatever order the pool is in beforehand, every
 * selection is equally likely, so the pool is never reset between draws.
 */
function drawToFront(pool: Uint8Array, count: number, rng: Sfc32): void {
  for (let i = 0; i < count; i++) {
    const j = i + rng.below(pool.length - i)
    const picked = pool[j]!
    pool[j] = pool[i]!
    pool[i] = picked
  }
}

export function createSimulationEngine(
  request: BatchSimulationRequest
): SimulationEngine {
  const { tickets, simulationCount: totalDraws, seed, recordDraws } = request
  const ticketCount = tickets.length
  const stakePerDraw = calculateTotalSimulationCost(tickets)
  const payoutMap = new Map(
    Object.entries(request.payouts).map(([cls, amount]) => [
      Number(cls),
      amount,
    ])
  )
  const rng = new Sfc32(seed)

  // --- Lookup tables, built once ---

  // Tickets of the same system (say 6 × 3) share one table: for every match
  // cell, what it pays, whether it wins at all, and the winning lines per class
  const systemOffsets = new Map<string, number>()
  const cellCentsList: number[] = []
  const cellClassCounts: Array<Record<number, number>> = []

  const ticketSystemOffset = new Int32Array(ticketCount)
  const ticketMainLow = new Int32Array(ticketCount)
  const ticketMainHigh = new Int32Array(ticketCount)
  const ticketEuro = new Int32Array(ticketCount)

  tickets.forEach((ticket, t) => {
    const m = ticket.mainNumbers.length
    const e = ticket.euroNumbers.length
    const systemKey = `${m}x${e}`
    let offset = systemOffsets.get(systemKey)
    if (offset === undefined) {
      offset = cellCentsList.length
      systemOffsets.set(systemKey, offset)
      for (let k = 0; k <= MAIN_NUMBERS_COUNT; k++) {
        for (let h = 0; h <= EURO_NUMBERS_COUNT; h++) {
          const classCounts = calculateWinningLineCounts(m, e, k, h)
          let cents = 0
          for (const [cls, lines] of Object.entries(classCounts)) {
            cents += Math.round((payoutMap.get(Number(cls)) ?? 0) * 100) * lines
          }
          cellCentsList.push(cents)
          cellClassCounts.push(classCounts)
        }
      }
    }
    ticketSystemOffset[t] = offset

    for (const n of ticket.mainNumbers) {
      if (n <= WORD_BITS) ticketMainLow[t]! |= 1 << (n - 1)
      else ticketMainHigh[t]! |= 1 << (n - 1 - WORD_BITS)
    }
    for (const n of ticket.euroNumbers) ticketEuro[t]! |= 1 << (n - 1)
  })

  const cellCents = Float64Array.from(cellCentsList)
  const cellWins = Uint8Array.from(cellClassCounts, (classCounts) =>
    Object.keys(classCounts).length > 0 ? 1 : 0
  )

  // --- Running totals ---

  let draws = 0
  let hits = 0
  let wonCents = 0
  let maxCents = 0
  // Draws per paid amount: the whole payout distribution, without the draws
  const payoutCounts = new Map<number, number>()
  // Per ticket: winning draws per match cell, and how often each of its
  // numbers took part in a win
  const ticketCellWins = new Uint32Array(ticketCount * MATCH_CELLS)
  const ticketMainWins = new Uint32Array(ticketCount * MAIN_SLOTS)
  const ticketEuroWins = new Uint32Array(ticketCount * EURO_SLOTS)

  const mainPool = numberPool(MAIN_NUMBER_MIN, MAIN_NUMBER_MAX)
  const euroPool = numberPool(EURO_NUMBER_MIN, EURO_NUMBER_MAX)

  const pointEvery = Math.max(1, Math.ceil(totalDraws / AUTOPLAY_CHART_POINTS))
  let nextPoint = Math.min(totalDraws, pointEvery)
  const trajectory: TrajectoryPoint[] = []
  const individualResults: IndividualSimulationResult[] = []

  const sortedFront = (pool: Uint8Array, count: number): number[] =>
    Array.from(pool.subarray(0, count)).sort((a, b) => a - b)

  const run = (count: number): void => {
    const end = Math.min(totalDraws, draws + count)

    while (draws < end) {
      drawToFront(mainPool, MAIN_NUMBERS_COUNT, rng)
      drawToFront(euroPool, EURO_NUMBERS_COUNT, rng)

      let drawnLow = 0
      let drawnHigh = 0
      for (let i = 0; i < MAIN_NUMBERS_COUNT; i++) {
        const n = mainPool[i]!
        if (n <= WORD_BITS) drawnLow |= 1 << (n - 1)
        else drawnHigh |= 1 << (n - 1 - WORD_BITS)
      }
      let drawnEuro = 0
      for (let i = 0; i < EURO_NUMBERS_COUNT; i++) {
        drawnEuro |= 1 << (euroPool[i]! - 1)
      }

      let cents = 0
      for (let t = 0; t < ticketCount; t++) {
        const matchedLow = ticketMainLow[t]! & drawnLow
        const matchedHigh = ticketMainHigh[t]! & drawnHigh
        const matchedEuro = ticketEuro[t]! & drawnEuro
        const cell =
          (bitCount(matchedLow) + bitCount(matchedHigh)) * EURO_MATCH_STEPS +
          bitCount(matchedEuro)
        const systemCell = ticketSystemOffset[t]! + cell
        if (cellWins[systemCell] === 0) continue

        cents += cellCents[systemCell]!
        ticketCellWins[t * MATCH_CELLS + cell]! += 1

        // Remember which of the ticket's numbers took part in this win
        for (let i = 0; i < MAIN_NUMBERS_COUNT; i++) {
          const n = mainPool[i]!
          const matched =
            n <= WORD_BITS
              ? matchedLow >>> (n - 1)
              : matchedHigh >>> (n - 1 - WORD_BITS)
          if (matched & 1) ticketMainWins[t * MAIN_SLOTS + n]! += 1
        }
        for (let i = 0; i < EURO_NUMBERS_COUNT; i++) {
          const n = euroPool[i]!
          if ((matchedEuro >>> (n - 1)) & 1) {
            ticketEuroWins[t * EURO_SLOTS + n]! += 1
          }
        }
      }

      if (cents > 0) {
        hits++
        wonCents += cents
        if (cents > maxCents) maxCents = cents
        payoutCounts.set(cents, (payoutCounts.get(cents) ?? 0) + 1)
      }

      if (recordDraws) {
        individualResults.push(
          simulateSingleDraw(
            tickets,
            sortedFront(mainPool, MAIN_NUMBERS_COUNT),
            sortedFront(euroPool, EURO_NUMBERS_COUNT),
            payoutMap,
            stakePerDraw,
            draws
          )
        )
      }

      draws++
      if (draws === nextPoint) {
        trajectory.push({
          draws,
          spent: draws * stakePerDraw,
          won: wonCents / 100,
        })
        nextPoint = Math.min(totalDraws, nextPoint + pointEvery)
      }
    }
  }

  /** Winning lines per class for one ticket, from its winning draws per match cell */
  const ticketClassCounts = (t: number): Record<number, number> => {
    const counts: Record<number, number> = {}
    for (let cell = 0; cell < MATCH_CELLS; cell++) {
      const wins = ticketCellWins[t * MATCH_CELLS + cell]!
      if (wins === 0) continue
      const classCounts = cellClassCounts[ticketSystemOffset[t]! + cell]!
      for (const [cls, lines] of Object.entries(classCounts)) {
        counts[Number(cls)] = (counts[Number(cls)] ?? 0) + lines * wins
      }
    }
    return counts
  }

  const winsByClass = (): Record<number, number> => {
    const totals: Record<number, number> = {}
    for (let t = 0; t < ticketCount; t++) {
      for (const [cls, lines] of Object.entries(ticketClassCounts(t))) {
        totals[Number(cls)] = (totals[Number(cls)] ?? 0) + lines
      }
    }
    return totals
  }

  const highlightingData = (): TicketHighlightingData => {
    const ticketStats: TicketHighlightingData['ticketStats'] = {}
    tickets.forEach((ticket, t) => {
      const frequency = (
        numbers: number[],
        wins: Uint32Array,
        slots: number
      ): Record<string, number> => {
        const counts: Record<string, number> = {}
        for (const n of numbers) {
          const count = wins[t * slots + n]!
          if (count > 0) counts[n] = count
        }
        return counts
      }

      let totalWins = 0
      for (let cell = 0; cell < MATCH_CELLS; cell++) {
        totalWins += ticketCellWins[t * MATCH_CELLS + cell]!
      }

      ticketStats[ticket.id] = {
        mainNumberFrequency: frequency(
          ticket.mainNumbers,
          ticketMainWins,
          MAIN_SLOTS
        ),
        euroNumberFrequency: frequency(
          ticket.euroNumbers,
          ticketEuroWins,
          EURO_SLOTS
        ),
        winClassCounts: ticketClassCounts(t),
        totalWins,
      }
    })
    return { ticketStats }
  }

  return {
    get draws() {
      return draws
    },
    run,
    snapshot: () => ({
      draws,
      totalDraws,
      totalCost: draws * stakePerDraw,
      totalWinnings: wonCents / 100,
      hits,
      maxWin: maxCents / 100,
      winsByClass: winsByClass(),
      trajectory: [...trajectory],
    }),
    result: () => ({
      ...calculateBatchStatistics({
        draws,
        stakePerDraw,
        payoutCounts,
        winsByClass: winsByClass(),
      }),
      highlightingData: highlightingData(),
      seed,
      ...(recordDraws ? { individualResults } : {}),
    }),
    trajectory: () => [...trajectory],
  }
}

/**
 * Play a whole run, reporting progress at most every
 * SIMULATION_PROGRESS_INTERVAL_MS. Blocks until the run is done, which is why
 * it belongs in a worker: stopping it means terminating that worker.
 */
export function runSimulation(
  request: BatchSimulationRequest,
  onProgress: (snapshot: SimulationSnapshot) => void,
  now: () => number = () => performance.now()
): SimulationOutcome {
  const engine = createSimulationEngine(request)
  let lastReport = now()

  while (engine.draws < request.simulationCount) {
    engine.run(SIMULATION_SLICE_DRAWS)
    if (
      engine.draws < request.simulationCount &&
      now() - lastReport >= SIMULATION_PROGRESS_INTERVAL_MS
    ) {
      onProgress(engine.snapshot())
      lastReport = now()
    }
  }

  return { result: engine.result(), trajectory: engine.trajectory() }
}
