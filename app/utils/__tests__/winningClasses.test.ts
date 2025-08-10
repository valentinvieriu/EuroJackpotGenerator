import { describe, it, expect } from 'vitest'
import { determineWinClass } from '../winningClasses'

describe('winningClasses', () => {
  it('maps (5,2) to class 1 and (3,0) to class 10', () => {
    expect(determineWinClass(5, 2)).toBe(1)
    expect(determineWinClass(3, 0)).toBe(10)
    expect(determineWinClass(0, 0)).toBeUndefined()
  })
})