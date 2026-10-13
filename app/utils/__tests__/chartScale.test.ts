import { describe, it, expect } from 'vitest'
import {
  linearScale,
  niceTicks,
  linePath,
  bandPath,
  nearestIndex,
} from '~/utils/chartScale'

describe('linearScale', () => {
  it('maps the domain onto the range', () => {
    const scale = linearScale([0, 100], [0, 500])
    expect(scale(0)).toBe(0)
    expect(scale(50)).toBe(250)
    expect(scale(100)).toBe(500)
  })

  it('supports inverted ranges for a y axis', () => {
    const scale = linearScale([0, 10], [200, 0])
    expect(scale(0)).toBe(200)
    expect(scale(10)).toBe(0)
  })

  it('returns the range start for an empty domain', () => {
    expect(linearScale([5, 5], [10, 90])(5)).toBe(10)
  })
})

describe('niceTicks', () => {
  it('picks round steps that cover the maximum', () => {
    expect(niceTicks(0, 20000)).toEqual([0, 5000, 10000, 15000, 20000])
    expect(niceTicks(0, 17300)).toEqual([0, 5000, 10000, 15000, 20000])
  })

  it('handles small ranges without float drift', () => {
    expect(niceTicks(0, 0.5, 5)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5])
  })

  it('degrades gracefully on empty or invalid input', () => {
    expect(niceTicks(0, 0)).toEqual([0])
    expect(niceTicks(0, Number.NaN)).toEqual([])
  })
})

describe('paths', () => {
  it('builds a line path', () => {
    expect(
      linePath([
        [0, 10],
        [5, 2.5],
        [10, 0],
      ])
    ).toBe('M0,10 L5,2.5 L10,0')
  })

  it('builds a closed band between two lines', () => {
    expect(
      bandPath(
        [
          [0, 10],
          [10, 0],
        ],
        [
          [0, 10],
          [10, 8],
        ]
      )
    ).toBe('M0,10 L10,0 L10,8 L0,10 Z')
  })

  it('returns an empty band when there is no data', () => {
    expect(bandPath([], [])).toBe('')
  })
})

describe('nearestIndex', () => {
  const xs = [0, 100, 200, 400]

  it('finds the closest value', () => {
    expect(nearestIndex(xs, 40)).toBe(0)
    expect(nearestIndex(xs, 60)).toBe(1)
    expect(nearestIndex(xs, 310)).toBe(3)
  })

  it('clamps outside the range', () => {
    expect(nearestIndex(xs, -50)).toBe(0)
    expect(nearestIndex(xs, 9999)).toBe(3)
  })

  it('returns -1 for an empty array', () => {
    expect(nearestIndex([], 5)).toBe(-1)
  })
})
