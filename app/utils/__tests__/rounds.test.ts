import { describe, it, expect } from 'vitest'
import {
  addLedgers,
  describeTicketSet,
  emptyLedger,
  keptShare,
} from '~/utils/rounds'

const standard = { mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] }
const system72 = { mainNumbers: [1, 2, 3, 4, 5, 6, 7], euroNumbers: [1, 2] }
const system63 = { mainNumbers: [1, 2, 3, 4, 5, 6], euroNumbers: [1, 2, 3] }

describe('addLedgers', () => {
  it('adds draws, money in and money out', () => {
    expect(
      addLedgers(
        { draws: 10, spent: 20, won: 4 },
        { draws: 1, spent: 2, won: 0 }
      )
    ).toEqual({ draws: 11, spent: 22, won: 4 })
  })

  it('adds nothing up to an empty ledger', () => {
    expect(addLedgers()).toEqual(emptyLedger())
  })
})

describe('keptShare', () => {
  it('is the part of the money paid in that did not come back', () => {
    expect(keptShare({ draws: 10, spent: 200, won: 50 })).toBe(0.75)
  })

  it('goes negative when more came back than went in', () => {
    expect(keptShare({ draws: 1, spent: 2, won: 5 })).toBe(-1.5)
  })

  it('has nothing to say before anything was paid in', () => {
    expect(keptShare(emptyLedger())).toBeNull()
  })
})

describe('describeTicketSet', () => {
  it('counts standard tickets', () => {
    expect(describeTicketSet([standard, standard], 'random')).toBe(
      '2 tickets · random'
    )
    expect(describeTicketSet([standard], null)).toBe('1 ticket')
  })

  it('names system tickets by their format', () => {
    expect(describeTicketSet([system72], 'favorites')).toBe(
      'System 7+2 · favorite numbers'
    )
    expect(describeTicketSet([system72, system72, system72], 'weighted')).toBe(
      '3 × System 7+2 · weighted by past draws'
    )
  })

  it('lists mixed formats in the order they first appear', () => {
    expect(
      describeTicketSet([system63, standard, system63, standard], 'unpopular')
    ).toBe('2 × System 6+3, 2 tickets · unpopular picks')
  })

  it('says so when there are no tickets', () => {
    expect(describeTicketSet([], null)).toBe('No tickets')
  })
})
