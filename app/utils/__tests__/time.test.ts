import { describe, it, expect } from 'vitest'
import { formatDuration, formatDurationCompact } from '../time'

describe('time utils', () => {
  it('formatDuration works for seconds, minutes, hours', () => {
    expect(formatDuration(12_000)).toBe('12s')
    expect(formatDuration(75_000)).toBe('1m 15s')
    expect(formatDuration(3_600_000 + 65_000)).toBe('1h 1m 5s')
  })
  it('formatDurationCompact works for seconds, minutes, hours', () => {
    expect(formatDurationCompact(12_000)).toBe('12s')
    expect(formatDurationCompact(75_000)).toBe('1m 15s')
    expect(formatDurationCompact(3_600_000 + 65_000)).toBe('1h 1m')
  })
})