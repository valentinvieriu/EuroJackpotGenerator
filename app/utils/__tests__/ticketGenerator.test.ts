import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../statisticsManager', () => ({
  fetchStatistics: vi.fn().mockResolvedValue(null),
}))

let seq = 0
vi.mock('../numberGenerator', () => ({
  generateNumbers: vi.fn((count: number, min: number) => {
    const start = min + seq * count * 2
    seq += 1
    return Array.from({ length: count }, (_, i) => start + i)
  }),
}))

beforeEach(() => {
  seq = 0
  vi.clearAllMocks()
  vi.resetModules()
})

describe('generateTickets', () => {
  it('validates input ranges', async () => {
    const { generateTickets } = await import('../ticketGenerator')
    await expect(generateTickets(0, 5, 2)).rejects.toThrow('ticketCount')
    await expect(generateTickets(1, 0, 2)).rejects.toThrow('mainCount')
    await expect(generateTickets(1, 5, 0)).rejects.toThrow('euroCount')
  })

  it('creates unique tickets with incrementing ids', async () => {
    const { generateTickets } = await import('../ticketGenerator')
    const tickets = await generateTickets(2, 5, 2)
    expect(tickets).toHaveLength(2)
    expect(tickets[0].id).toBe(1)
    expect(tickets[1].id).toBe(2)

    const combos = tickets.map(
      (t) => `${t.mainNumbers.join(',')}|${t.euroNumbers.join(',')}`
    )
    expect(new Set(combos).size).toBe(2)
  })
})
