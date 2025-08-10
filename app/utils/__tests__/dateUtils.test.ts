import { describe, it, expect, vi } from 'vitest'
import { generateEurojackpotUrl, EurojackpotDrawType } from '../dateUtils'

describe('dateUtils', () => {
  it('generates a URL with expected gckey pattern YYYY-WW-D', () => {
    // Freeze time to a known date to make weekday stable: 2025-08-06 (Wednesday)
    vi.setSystemTime(new Date('2025-08-06T12:00:00Z'))
    const urlPrev = generateEurojackpotUrl(EurojackpotDrawType.PREVIOUS)
    const urlNext = generateEurojackpotUrl(EurojackpotDrawType.NEXT)

    expect(urlPrev).toMatch(/getEurojackpotHistoricOdds\?gckey=\d{4}-\d{2}-[25]$/)
    expect(urlNext).toMatch(/getEurojackpotHistoricOdds\?gckey=\d{4}-\d{2}-[25]$/)
  })
})