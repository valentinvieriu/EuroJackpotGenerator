import { nCr } from './combinatorics'
import { winningClassesMap } from './winningClasses'
import {
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MAX,
  MAIN_NUMBERS_COUNT,
  EURO_NUMBERS_COUNT,
  EUROJACKPOT_PAYOUT_RATIO,
  EUROJACKPOT_PRIZE_POOL_SHARES,
  EUROJACKPOT_BOOSTER_FUND_SHARE,
} from './constants'

export interface PrizeClass {
  winClass: number
  /** Main numbers matched */
  main: number
  /** Euro numbers matched */
  euro: number
  /** Human-readable match, e.g. "5 + 2" */
  label: string
  /** Exact probability that a single line lands in this class */
  probability: number
  /**
   * Long-run payback from this class per euro staked, by the game's rules:
   * its share of the prize pool × the half of stakes that forms the pool.
   */
  longRunReturn: number
}

const TOTAL_COMBINATIONS =
  nCr(MAIN_NUMBER_MAX, MAIN_NUMBERS_COUNT) *
  nCr(EURO_NUMBER_MAX, EURO_NUMBERS_COUNT)

const JACKPOT_CLASS = 1

function matchProbability(main: number, euro: number): number {
  const ways =
    nCr(MAIN_NUMBERS_COUNT, main) *
    nCr(MAIN_NUMBER_MAX - MAIN_NUMBERS_COUNT, MAIN_NUMBERS_COUNT - main) *
    nCr(EURO_NUMBERS_COUNT, euro) *
    nCr(EURO_NUMBER_MAX - EURO_NUMBERS_COUNT, EURO_NUMBERS_COUNT - euro)
  return ways / TOTAL_COMBINATIONS
}

/**
 * The 12 prize classes with exact single-line probabilities, derived from the
 * game format rather than a rounded odds table. Ordered from class 1 (jackpot) down.
 */
export const PRIZE_CLASSES: ReadonlyArray<PrizeClass> = [...winningClassesMap]
  .sort((a, b) => a.class - b.class)
  .map(({ main, euro, class: winClass }) => ({
    winClass,
    main,
    euro,
    label: `${main} + ${euro}`,
    probability: matchProbability(main, euro),
    longRunReturn:
      (EUROJACKPOT_PRIZE_POOL_SHARES[winClass] ?? 0) * EUROJACKPOT_PAYOUT_RATIO,
  }))

/** Probability that a single line wins any prize at all. */
export const ANY_PRIZE_PROBABILITY = PRIZE_CLASSES.reduce(
  (sum, prizeClass) => sum + prizeClass.probability,
  0
)

/** What the game pays back per euro staked over the long run, by its rules. */
export const LONG_RUN_RETURN = EUROJACKPOT_PAYOUT_RATIO

/**
 * The part of the long-run payback that is not assigned to a class directly:
 * a reserve that tops up jackpots, so in the end it is paid out as class 1.
 */
export const BOOSTER_FUND_RETURN =
  EUROJACKPOT_BOOSTER_FUND_SHARE * EUROJACKPOT_PAYOUT_RATIO

export function getPrizeClass(winClass: number): PrizeClass | undefined {
  return PRIZE_CLASSES.find((prizeClass) => prizeClass.winClass === winClass)
}

/** "2 + 1" style label for a win class; falls back to the class number. */
export function matchLabel(winClass: number): string {
  return getPrizeClass(winClass)?.label ?? `Class ${winClass}`
}

/** Expected number of hits in a class after playing the given number of lines. */
export function expectedHits(winClass: number, lines: number): number {
  return (getPrizeClass(winClass)?.probability ?? 0) * lines
}

export interface ReachSplit {
  /** Classes a run of this size expects to hit at least once */
  withinReach: PrizeClass[]
  /** Classes in which it expects less than one hit */
  outOfReach: PrizeClass[]
  /**
   * Hits the run expects across all out-of-reach classes together. Several
   * classes that each expect under one hit can still add up to a likely hit.
   */
  expectedHitsOutOfReach: number
  /** Long-run payback per euro carried by the classes within reach */
  returnWithinReach: number
  /** The rest of the long-run payback, locked up in prizes out of reach */
  returnOutOfReach: number
}

/**
 * Split the game's long-run payback into what a run of `lines` lines can
 * realistically collect and what it will almost certainly miss.
 *
 * A class is "within reach" when the run expects at least one hit in it. This is
 * why a short simulation, or a lifetime of playing, returns far less than the
 * game's average: most of the average is paid out through the rarest classes.
 */
export function splitReturnByReach(lines: number): ReachSplit {
  const withinReach: PrizeClass[] = []
  const outOfReach: PrizeClass[] = []
  for (const prizeClass of PRIZE_CLASSES) {
    const reachable = prizeClass.probability * lines >= 1
    ;(reachable ? withinReach : outOfReach).push(prizeClass)
  }

  // The jackpot reserve only pays out with a jackpot
  const jackpotWithinReach = withinReach.some(
    (prizeClass) => prizeClass.winClass === JACKPOT_CLASS
  )
  const returnWithinReach =
    withinReach.reduce((sum, c) => sum + c.longRunReturn, 0) +
    (jackpotWithinReach ? BOOSTER_FUND_RETURN : 0)

  return {
    withinReach,
    outOfReach,
    expectedHitsOutOfReach: outOfReach.reduce(
      (sum, c) => sum + c.probability * lines,
      0
    ),
    returnWithinReach,
    returnOutOfReach: Math.max(0, LONG_RUN_RETURN - returnWithinReach),
  }
}
