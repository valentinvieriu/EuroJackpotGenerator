import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../statistics', () => ({
  fetchStatistics: vi.fn().mockResolvedValue(null),
}))

let seq = 0
vi.mock('~/utils/numberGenerator', () => ({
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

describe('server generateTickets', () => {
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

  it('fetches statistics for weighted generation', async () => {
    const mockStats = {
      numbers: [{ number: 1, value: 10 }],
      additionalNumbers: [{ number: 1, value: 5 }],
    }

    const { fetchStatistics } = await import('../statistics')
    vi.mocked(fetchStatistics).mockResolvedValue(mockStats)

    const { generateTickets } = await import('../ticketGenerator')
    await generateTickets(1, 5, 2, { algorithm: 'weighted' })

    expect(fetchStatistics).toHaveBeenCalledOnce()
  })
})
