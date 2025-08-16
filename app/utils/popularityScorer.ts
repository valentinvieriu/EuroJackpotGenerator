/**
 * EuroJackpot Popularity Scorer (Heuristic)
 * ------------------------------------------
 * Estimates how "popular" a 5/50 + 2/12 combination is among humans,
 * based on documented biases. No external data required.
 *
 * IMPORTANT:
 * - This changes ONLY expected prize splitting *conditional on winning*.
 * - It does NOT change the chance of winning or the house edge.
 * - All weights are conservative and clamped to avoid overclaiming.
 */

import {
  MAIN_NUMBER_MIN,
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MIN,
  EURO_NUMBER_MAX,
  MAIN_NUMBERS_COUNT,
  EURO_NUMBERS_COUNT,
  EUROJACKPOT_TOTAL_COMBINATIONS,
  POPULARITY_WEIGHT_BIRTHDAY_PER_MAIN,
  POPULARITY_WEIGHT_LUCKY_PER_MAIN,
  POPULARITY_WEIGHT_SEQUENCE_BASE,
  POPULARITY_WEIGHT_SAME_LAST_DIGIT,
  POPULARITY_WEIGHT_SAME_DECADE,
  POPULARITY_WEIGHT_TIGHT_SPREAD,
  POPULARITY_WEIGHT_EURO_MONTH,
  POPULARITY_Q_MIN,
  POPULARITY_Q_MAX,
  POPULARITY_LUCKY_NUMBERS,
  POPULARITY_EURO_MONTH_SPREAD_THRESHOLD,
} from './constants'

export interface EuroJackpotCombo {
  mains: number[]
  euros: number[]
}

export interface PopularityWeights {
  birthdayPerMain: number
  luckyPerMain: number
  luckySet: Set<number>
  seqBase: number
  sameLastDigitPair: number
  sameDecadePair: number
  tightSpread: number
  euroMonthEffect: number
  qMin: number
  qMax: number
}

export interface PopularityFeatures {
  fBirthday: number
  fLucky: number
  fSeqLen: number
  fSameLast: number
  fSameDecade: number
  fTight: number
  fEuroMonth: number
  raw: number
}

export interface PopularityResult {
  popularityScore: number // 0-100 (higher = more commonly chosen)
  unpopularityScore: number // 0-100 (higher = better for avoiding splits)
  qMultiplier: number // relative to uniform pick probability
  expectedLambda: (ticketsSold: number) => number
  expectedShare: (ticketsSold: number) => number
  features: PopularityFeatures
  explain: string[]
  constants: {
    combinations: number
    qUniform: number
    bounds: { qMin: number; qMax: number }
  }
}

const DEFAULT_WEIGHTS: PopularityWeights = Object.freeze({
  birthdayPerMain: POPULARITY_WEIGHT_BIRTHDAY_PER_MAIN,
  luckyPerMain: POPULARITY_WEIGHT_LUCKY_PER_MAIN,
  luckySet: POPULARITY_LUCKY_NUMBERS,
  seqBase: POPULARITY_WEIGHT_SEQUENCE_BASE,
  sameLastDigitPair: POPULARITY_WEIGHT_SAME_LAST_DIGIT,
  sameDecadePair: POPULARITY_WEIGHT_SAME_DECADE,
  tightSpread: POPULARITY_WEIGHT_TIGHT_SPREAD,
  euroMonthEffect: POPULARITY_WEIGHT_EURO_MONTH,
  qMin: POPULARITY_Q_MIN,
  qMax: POPULARITY_Q_MAX,
})

/**
 * Validate and normalize inputs.
 */
function validateCombo(mains: number[], euros: number[]): void {
  if (!Array.isArray(mains) || !Array.isArray(euros)) {
    throw new TypeError('mains and euros must be arrays')
  }
  if (
    mains.length !== MAIN_NUMBERS_COUNT ||
    euros.length !== EURO_NUMBERS_COUNT
  ) {
    throw new Error('EuroJackpot requires 5 main numbers and 2 euro numbers')
  }
  const uniqMains = new Set(mains)
  const uniqEuros = new Set(euros)
  if (uniqMains.size !== mains.length || uniqEuros.size !== euros.length) {
    throw new Error('Numbers must be unique within mains and within euros')
  }
  for (const m of mains) {
    if (m < MAIN_NUMBER_MIN || m > MAIN_NUMBER_MAX) {
      throw new Error('Main numbers must be in 1..50')
    }
  }
  for (const e of euros) {
    if (e < EURO_NUMBER_MIN || e > EURO_NUMBER_MAX) {
      throw new Error('Euro numbers must be in 1..12')
    }
  }
}

/**
 * Feature helpers
 */
function countMainsLE31(mains: number[]): number {
  return mains.filter((n) => n <= 31).length
}

function countLuckyMains(mains: number[], luckySet: Set<number>): number {
  return mains.filter((n) => luckySet.has(n)).length
}

function maxArithmeticSequenceLen(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b)
  let best = 1
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const d = sorted[j] - sorted[i]
      let cur = 2
      let last = sorted[j]
      for (let z = j + 1; z < sorted.length; z++) {
        if (sorted[z] - last === d) {
          cur++
          last = sorted[z]
        }
      }
      if (cur > best) best = cur
    }
  }
  return best
}

function countSameLastDigitPairs(mains: number[]): number {
  const byLastDigit = new Map<number, number>()
  for (const n of mains) {
    const d = n % 10
    byLastDigit.set(d, (byLastDigit.get(d) || 0) + 1)
  }
  let pairs = 0
  for (const c of byLastDigit.values()) {
    if (c >= 2) pairs += (c * (c - 1)) / 2
  }
  return pairs
}

function countSameDecadePairs(mains: number[]): number {
  const decade = (n: number) => Math.floor((n - 1) / 10)
  const byDecade = new Map<number, number>()
  for (const n of mains) {
    const d = decade(n)
    byDecade.set(d, (byDecade.get(d) || 0) + 1)
  }
  let pairs = 0
  for (const c of byDecade.values()) {
    if (c >= 2) pairs += (c * (c - 1)) / 2
  }
  return pairs
}

function spreadScore(mains: number[]): number {
  const sorted = [...mains].sort((a, b) => a - b)
  const spread = sorted[sorted.length - 1] - sorted[0]
  const normalised = 1 - (spread - 4) / (49 - 4)
  return Math.max(0, Math.min(1, normalised))
}

function euroMonthFeature(euros: number[]): number {
  const [a, b] = euros[0] < euros[1] ? euros : [euros[1], euros[0]]
  const spread = Math.abs(a - b)
  return spread <= POPULARITY_EURO_MONTH_SPREAD_THRESHOLD ? 1 : 0
}

/**
 * Map a raw popularity "logit" to a bounded qMultiplier using tanh.
 * Center at 0 → q=1. Scale softly so typical combos sit ~[0.8..1.2].
 */
function rawToQMultiplier(raw: number, qMin: number, qMax: number): number {
  const span = qMax - 1
  const q = 1 + span * Math.tanh(raw)
  const qClamped = Math.max(qMin, Math.min(qMax, q))
  return qClamped
}

/**
 * Main scoring function.
 * @param combo { mains: number[5], euros: number[2] }
 * @param weights optional overrides/calibration
 * @returns score & share metrics
 */
export function scorePopularity(
  combo: EuroJackpotCombo,
  weights: PopularityWeights = DEFAULT_WEIGHTS
): PopularityResult {
  const { mains, euros } = combo
  validateCombo(mains, euros)

  // Feature extraction (transparent, explainable)
  const fBirthday = countMainsLE31(mains)
  const fLucky = countLuckyMains(mains, weights.luckySet)
  const fSeqLen = maxArithmeticSequenceLen(mains)
  const fSameLast = countSameLastDigitPairs(mains)
  const fSameDecade = countSameDecadePairs(mains)
  const fTight = spreadScore(mains)
  const fEuroMonth = euroMonthFeature(euros)

  // Raw score (higher -> more popular)
  const raw =
    weights.birthdayPerMain * fBirthday +
    weights.luckyPerMain * fLucky +
    weights.seqBase * Math.max(0, fSeqLen - 2) +
    weights.sameLastDigitPair * fSameLast +
    weights.sameDecadePair * fSameDecade +
    weights.tightSpread * fTight +
    weights.euroMonthEffect * fEuroMonth

  // Convert to qMultiplier (relative to uniform) with safe bounds
  const qMultiplier = rawToQMultiplier(raw, weights.qMin, weights.qMax)

  // Popularity score 0..100 from qMultiplier relative position
  const popularityScore = Math.round(
    ((qMultiplier - weights.qMin) / (weights.qMax - weights.qMin)) * 100
  )
  const unpopularityScore = 100 - popularityScore

  // Helper: expected co-winners lambda given tickets sold T (Poisson)
  const qUniform = 1 / EUROJACKPOT_TOTAL_COMBINATIONS
  function expectedLambda(ticketsSold: number): number {
    const q = qUniform * qMultiplier
    return Math.max(0, Math.max(0, ticketsSold - 1) * q)
  }

  // Helper: E[1/(S+1)] for S ~ Poisson(lambda)
  function expectedShare(ticketsSold: number): number {
    const lambda = expectedLambda(ticketsSold)
    if (lambda <= 1e-9) return 1
    return (1 - Math.exp(-lambda)) / lambda
  }

  return {
    popularityScore,
    unpopularityScore,
    qMultiplier,
    expectedLambda,
    expectedShare,
    features: {
      fBirthday,
      fLucky,
      fSeqLen,
      fSameLast,
      fSameDecade,
      fTight,
      fEuroMonth,
      raw,
    },
    explain: [
      fBirthday > 0 && `${fBirthday} main(s) in 1–31 (birthday bias)`,
      fLucky > 0 && `${fLucky} "lucky" main(s) {3,7,11,13,17,21}`,
      fSeqLen >= 3 && `arithmetic run of length ${fSeqLen}`,
      fSameLast >= 1 && `${fSameLast} pair(s) share last digit`,
      fSameDecade >= 1 && `${fSameDecade} pair(s) in same decade`,
      fTight > 0.66 && `tight spread (numbers bunched)`,
      fEuroMonth === 1 && `euro numbers close (month-like)`,
    ].filter(Boolean) as string[],
    constants: {
      combinations: EUROJACKPOT_TOTAL_COMBINATIONS,
      qUniform,
      bounds: { qMin: weights.qMin, qMax: weights.qMax },
    },
  }
}

/**
 * Helper function to create example combinations for demonstration
 */
export function createExampleCombinations(): {
  popular: EuroJackpotCombo
  unpopular: EuroJackpotCombo
} {
  return {
    popular: { mains: [1, 2, 3, 4, 5], euros: [7, 11] }, // very popular-looking
    unpopular: { mains: [6, 19, 28, 37, 49], euros: [1, 12] }, // likely less popular
  }
}

/**
 * Helper function to get a human-readable explanation of popularity factors
 */
export function getPopularityExplanation(result: PopularityResult): string {
  if (result.explain.length === 0) {
    return 'This combination avoids common biases and patterns, making it less likely to be chosen by other players.'
  }

  const factorsText = result.explain.join(', ')
  return `This combination includes: ${factorsText}. These patterns are commonly chosen by players, potentially increasing prize sharing.`
}

/**
 * Default weights for easy access
 */
export { DEFAULT_WEIGHTS }
