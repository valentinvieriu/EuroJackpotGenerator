import { describe, it, expect } from 'vitest'
import {
  MAIN_NUMBER_MAX,
  EURO_NUMBER_MAX,
  MAIN_NUMBER_MIN,
  EURO_NUMBER_MIN,
} from '../constants'

describe('Constants', () => {
  it('should have correct main number range', () => {
    expect(MAIN_NUMBER_MIN).toBe(1)
    expect(MAIN_NUMBER_MAX).toBe(50)
  })

  it('should have correct euro number range', () => {
    expect(EURO_NUMBER_MIN).toBe(1)
    expect(EURO_NUMBER_MAX).toBe(12)
  })
})
