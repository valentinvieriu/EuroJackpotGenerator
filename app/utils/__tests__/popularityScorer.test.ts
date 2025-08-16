import { describe, it, expect } from 'vitest'
import {
  scorePopularity,
  createExampleCombinations,
  getPopularityExplanation,
  DEFAULT_WEIGHTS,
  type EuroJackpotCombo,
  type PopularityWeights,
} from '../popularityScorer'

describe('popularityScorer', () => {
  describe('scorePopularity', () => {
    it('validates input correctly', () => {
      // Invalid arrays
      expect(() =>
        scorePopularity({ mains: 'invalid' as any, euros: [1, 2] })
      ).toThrow('mains and euros must be arrays')
      expect(() =>
        scorePopularity({ mains: [1, 2, 3], euros: 'invalid' as any })
      ).toThrow('mains and euros must be arrays')

      // Wrong number count
      expect(() =>
        scorePopularity({ mains: [1, 2, 3], euros: [1, 2] })
      ).toThrow('EuroJackpot requires 5 main numbers and 2 euro numbers')
      expect(() =>
        scorePopularity({ mains: [1, 2, 3, 4, 5], euros: [1] })
      ).toThrow('EuroJackpot requires 5 main numbers and 2 euro numbers')

      // Duplicate numbers
      expect(() =>
        scorePopularity({ mains: [1, 1, 3, 4, 5], euros: [1, 2] })
      ).toThrow('Numbers must be unique within mains and within euros')
      expect(() =>
        scorePopularity({ mains: [1, 2, 3, 4, 5], euros: [1, 1] })
      ).toThrow('Numbers must be unique within mains and within euros')

      // Out of range numbers
      expect(() =>
        scorePopularity({ mains: [0, 2, 3, 4, 5], euros: [1, 2] })
      ).toThrow('Main numbers must be in 1..50')
      expect(() =>
        scorePopularity({ mains: [1, 2, 3, 4, 51], euros: [1, 2] })
      ).toThrow('Main numbers must be in 1..50')
      expect(() =>
        scorePopularity({ mains: [1, 2, 3, 4, 5], euros: [0, 2] })
      ).toThrow('Euro numbers must be in 1..12')
      expect(() =>
        scorePopularity({ mains: [1, 2, 3, 4, 5], euros: [1, 13] })
      ).toThrow('Euro numbers must be in 1..12')
    })

    it('returns valid result structure', () => {
      const combo: EuroJackpotCombo = { mains: [1, 2, 3, 4, 5], euros: [1, 2] }
      const result = scorePopularity(combo)

      expect(result).toMatchObject({
        popularityScore: expect.any(Number),
        unpopularityScore: expect.any(Number),
        qMultiplier: expect.any(Number),
        expectedLambda: expect.any(Function),
        expectedShare: expect.any(Function),
        features: expect.any(Object),
        explain: expect.any(Array),
        constants: expect.any(Object),
      })

      // Scores should be 0-100
      expect(result.popularityScore).toBeGreaterThanOrEqual(0)
      expect(result.popularityScore).toBeLessThanOrEqual(100)
      expect(result.unpopularityScore).toBeGreaterThanOrEqual(0)
      expect(result.unpopularityScore).toBeLessThanOrEqual(100)

      // Scores should be complementary
      expect(result.popularityScore + result.unpopularityScore).toBe(100)

      // qMultiplier should be within bounds
      expect(result.qMultiplier).toBeGreaterThanOrEqual(DEFAULT_WEIGHTS.qMin)
      expect(result.qMultiplier).toBeLessThanOrEqual(DEFAULT_WEIGHTS.qMax)
    })

    it('detects birthday bias correctly', () => {
      const birthdayCombo: EuroJackpotCombo = {
        mains: [1, 15, 25, 30, 31],
        euros: [1, 2],
      }
      const noBirthdayCombo: EuroJackpotCombo = {
        mains: [32, 35, 40, 45, 50],
        euros: [1, 2],
      }

      const birthdayResult = scorePopularity(birthdayCombo)
      const noBirthdayResult = scorePopularity(noBirthdayCombo)

      expect(birthdayResult.features.fBirthday).toBe(5) // All 5 numbers ≤31
      expect(noBirthdayResult.features.fBirthday).toBe(0) // No numbers ≤31

      expect(birthdayResult.popularityScore).toBeGreaterThan(
        noBirthdayResult.popularityScore
      )
    })

    it('detects lucky numbers correctly', () => {
      const luckyCombo: EuroJackpotCombo = {
        mains: [3, 7, 11, 13, 17],
        euros: [1, 2],
      }
      const unluckyCombo: EuroJackpotCombo = {
        mains: [32, 34, 36, 38, 40], // No birthday bias, no lucky numbers, no sequences
        euros: [1, 12],
      }

      const luckyResult = scorePopularity(luckyCombo)
      const unluckyResult = scorePopularity(unluckyCombo)

      expect(luckyResult.features.fLucky).toBe(5) // All numbers are lucky
      expect(unluckyResult.features.fLucky).toBe(0) // No lucky numbers

      expect(luckyResult.popularityScore).toBeGreaterThan(
        unluckyResult.popularityScore
      )
    })

    it('detects arithmetic sequences correctly', () => {
      const sequenceCombo: EuroJackpotCombo = {
        mains: [1, 2, 3, 4, 5],
        euros: [1, 2],
      }
      const spacedSequenceCombo: EuroJackpotCombo = {
        mains: [5, 10, 15, 20, 25],
        euros: [1, 2],
      }
      const randomCombo: EuroJackpotCombo = {
        mains: [2, 9, 17, 31, 43],
        euros: [1, 2],
      }

      const sequenceResult = scorePopularity(sequenceCombo)
      const spacedResult = scorePopularity(spacedSequenceCombo)
      const randomResult = scorePopularity(randomCombo)

      expect(sequenceResult.features.fSeqLen).toBe(5) // Full consecutive sequence
      expect(spacedResult.features.fSeqLen).toBe(5) // Arithmetic sequence with d=5
      expect(randomResult.features.fSeqLen).toBeLessThan(5) // No long sequence

      expect(sequenceResult.popularityScore).toBeGreaterThan(
        randomResult.popularityScore
      )
      expect(spacedResult.popularityScore).toBeGreaterThan(
        randomResult.popularityScore
      )
    })

    it('detects same last digit patterns correctly', () => {
      const sameLastCombo: EuroJackpotCombo = {
        mains: [7, 17, 27, 37, 47],
        euros: [1, 2],
      }
      const mixedCombo: EuroJackpotCombo = {
        mains: [1, 12, 23, 34, 45],
        euros: [1, 2],
      }

      const sameLastResult = scorePopularity(sameLastCombo)
      const mixedResult = scorePopularity(mixedCombo)

      expect(sameLastResult.features.fSameLast).toBeGreaterThan(0) // Multiple pairs with same last digit
      expect(mixedResult.features.fSameLast).toBe(0) // No pairs with same last digit

      expect(sameLastResult.popularityScore).toBeGreaterThan(
        mixedResult.popularityScore
      )
    })

    it('detects same decade patterns correctly', () => {
      const sameDecadeCombo: EuroJackpotCombo = {
        mains: [11, 12, 13, 14, 15],
        euros: [1, 2],
      }
      const mixedDecadeCombo: EuroJackpotCombo = {
        mains: [9, 19, 29, 39, 49], // Different decades: 0,1,2,3,4
        euros: [1, 12],
      }

      const sameDecadeResult = scorePopularity(sameDecadeCombo)
      const mixedDecadeResult = scorePopularity(mixedDecadeCombo)

      expect(sameDecadeResult.features.fSameDecade).toBeGreaterThan(0) // All in same decade
      expect(mixedDecadeResult.features.fSameDecade).toBe(0) // Different decades

      expect(sameDecadeResult.popularityScore).toBeGreaterThan(
        mixedDecadeResult.popularityScore
      )
    })

    it('detects tight spread correctly', () => {
      const tightCombo: EuroJackpotCombo = {
        mains: [10, 11, 12, 13, 14],
        euros: [1, 2],
      }
      const spreadCombo: EuroJackpotCombo = {
        mains: [1, 15, 25, 35, 50],
        euros: [1, 2],
      }

      const tightResult = scorePopularity(tightCombo)
      const spreadResult = scorePopularity(spreadCombo)

      expect(tightResult.features.fTight).toBeGreaterThan(
        spreadResult.features.fTight
      )
      expect(tightResult.popularityScore).toBeGreaterThan(
        spreadResult.popularityScore
      )
    })

    it('detects euro month effect correctly', () => {
      const closeEuroCombo: EuroJackpotCombo = {
        mains: [1, 2, 3, 4, 5],
        euros: [7, 8],
      }
      const farEuroCombo: EuroJackpotCombo = {
        mains: [1, 2, 3, 4, 5],
        euros: [1, 12],
      }

      const closeResult = scorePopularity(closeEuroCombo)
      const farResult = scorePopularity(farEuroCombo)

      expect(closeResult.features.fEuroMonth).toBe(1) // Close euro numbers
      expect(farResult.features.fEuroMonth).toBe(0) // Far apart euro numbers
    })

    it('provides meaningful explanations', () => {
      const veryPopularCombo: EuroJackpotCombo = {
        mains: [1, 2, 3, 7, 11], // Birthday bias + lucky numbers + sequence
        euros: [7, 8], // Close euro numbers
      }
      const unpopularCombo: EuroJackpotCombo = {
        mains: [6, 19, 28, 37, 49], // No obvious patterns
        euros: [1, 12], // Far apart euro numbers
      }

      const popularResult = scorePopularity(veryPopularCombo)
      const unpopularResult = scorePopularity(unpopularCombo)

      expect(popularResult.explain.length).toBeGreaterThan(0)
      expect(unpopularResult.explain.length).toBeLessThan(
        popularResult.explain.length
      )

      expect(
        popularResult.explain.some((exp) => exp.includes('birthday'))
      ).toBe(true)
      expect(popularResult.explain.some((exp) => exp.includes('lucky'))).toBe(
        true
      )
    })

    it('handles helper functions correctly', () => {
      const combo: EuroJackpotCombo = { mains: [1, 2, 3, 4, 5], euros: [1, 2] }
      const result = scorePopularity(combo)

      // Test expectedLambda
      expect(result.expectedLambda(0)).toBe(0)
      expect(result.expectedLambda(1)).toBe(0)
      expect(result.expectedLambda(1000000)).toBeGreaterThan(0)

      // Test expectedShare
      expect(result.expectedShare(0)).toBe(1)
      expect(result.expectedShare(1)).toBe(1)
      expect(result.expectedShare(1000000)).toBeLessThanOrEqual(1)
      expect(result.expectedShare(1000000)).toBeGreaterThan(0)
    })

    it('works with custom weights', () => {
      const combo: EuroJackpotCombo = {
        mains: [32, 34, 36, 38, 40],
        euros: [1, 12],
      }

      const customWeights: PopularityWeights = {
        ...DEFAULT_WEIGHTS,
        birthdayPerMain: 0, // Disable birthday bias
        seqBase: 1.0, // Increase sequence penalty
      }

      const defaultResult = scorePopularity(combo)
      const customResult = scorePopularity(combo, customWeights)

      expect(customResult.popularityScore).not.toBe(
        defaultResult.popularityScore
      )
    })
  })

  describe('createExampleCombinations', () => {
    it('returns valid example combinations', () => {
      const examples = createExampleCombinations()

      expect(examples.popular.mains).toHaveLength(5)
      expect(examples.popular.euros).toHaveLength(2)
      expect(examples.unpopular.mains).toHaveLength(5)
      expect(examples.unpopular.euros).toHaveLength(2)

      // Popular should score higher than unpopular
      const popularResult = scorePopularity(examples.popular)
      const unpopularResult = scorePopularity(examples.unpopular)

      expect(popularResult.popularityScore).toBeGreaterThan(
        unpopularResult.popularityScore
      )
    })
  })

  describe('getPopularityExplanation', () => {
    it('returns appropriate explanations', () => {
      const veryPopularCombo: EuroJackpotCombo = {
        mains: [1, 2, 3, 7, 11],
        euros: [7, 8],
      }
      const unpopularCombo: EuroJackpotCombo = {
        mains: [36, 42, 38, 49, 33], // No birthday bias, spread across decades
        euros: [3, 10],
      }

      const popularResult = scorePopularity(veryPopularCombo)
      const unpopularResult = scorePopularity(unpopularCombo)

      const popularExplanation = getPopularityExplanation(popularResult)
      const unpopularExplanation = getPopularityExplanation(unpopularResult)

      expect(typeof popularExplanation).toBe('string')
      expect(typeof unpopularExplanation).toBe('string')

      expect(popularExplanation).toContain('combination includes')
      // The unpopular combination should have fewer patterns than the popular one
      expect(unpopularResult.explain.length).toBeLessThan(
        popularResult.explain.length
      )
    })
  })

  describe('edge cases', () => {
    it('handles boundary values correctly', () => {
      // Minimum valid combination
      const minCombo: EuroJackpotCombo = {
        mains: [1, 2, 3, 4, 5],
        euros: [1, 2],
      }
      // Maximum valid combination
      const maxCombo: EuroJackpotCombo = {
        mains: [46, 47, 48, 49, 50],
        euros: [11, 12],
      }

      expect(() => scorePopularity(minCombo)).not.toThrow()
      expect(() => scorePopularity(maxCombo)).not.toThrow()

      const minResult = scorePopularity(minCombo)
      const maxResult = scorePopularity(maxCombo)

      expect(minResult.popularityScore).toBeGreaterThanOrEqual(0)
      expect(maxResult.popularityScore).toBeGreaterThanOrEqual(0)
    })

    it('handles extreme weights correctly', () => {
      const combo: EuroJackpotCombo = { mains: [1, 2, 3, 4, 5], euros: [1, 2] }

      const extremeWeights: PopularityWeights = {
        ...DEFAULT_WEIGHTS,
        qMin: 0.1,
        qMax: 10.0,
      }

      const result = scorePopularity(combo, extremeWeights)

      expect(result.qMultiplier).toBeGreaterThanOrEqual(extremeWeights.qMin)
      expect(result.qMultiplier).toBeLessThanOrEqual(extremeWeights.qMax)
    })
  })
})
