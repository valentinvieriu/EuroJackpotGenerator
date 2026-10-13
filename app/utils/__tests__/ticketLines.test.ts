import { describe, expect, it } from 'vitest'
import {
  parseTicketLines,
  formatTicketLines,
  ticketsToStandardLines,
  buildLottoBayernUrl,
  readHandoff,
  type TicketLine,
} from '~/utils/ticketLines'
import type { Ticket } from '~/schemas'

const ticket: Ticket = {
  id: 1,
  mainNumbers: [4, 12, 20, 27, 49],
  euroNumbers: [2, 9],
  linesCount: 1,
}
const line: TicketLine = {
  mainNumbers: [4, 12, 20, 27, 49],
  euroNumbers: [2, 9],
}

const standardTicket = (id: number): Ticket => ({
  id,
  // Distinct, valid numbers for ids 1..20
  mainNumbers: [id, id + 10, id + 20, id + 25, id + 30],
  euroNumbers: [1, (id % 11) + 2],
  linesCount: 1,
})

describe('parseTicketLines', () => {
  it('reads app tickets, plain text and the earlier snippet formats', () => {
    for (const input of [
      JSON.stringify([ticket]),
      JSON.stringify({ tickets: [ticket] }),
      JSON.stringify([line]),
      JSON.stringify([{ mains: line.mainNumbers, euros: line.euroNumbers }]),
      JSON.stringify([4, 12, 20, 27, 49, 2, 9]),
      '4 12 20 27 49 | 2 9',
      '4,12,20,27,49 + 2,9',
      '4 12 20 27 49 2 9',
      JSON.stringify({
        mainPrognosises: {
          EUROJACKPOT: [
            {
              prognosises: line.mainNumbers,
              additionalPrognosises: line.euroNumbers,
            },
          ],
        },
      }),
    ]) {
      expect(parseTicketLines(input)).toEqual([line])
    }
  })

  it('reads several lines and sorts each one', () => {
    expect(
      parseTicketLines('49 4 27 12 20 | 9 2\n8 16 25 34 46 | 5 11')
    ).toEqual([
      line,
      { mainNumbers: [8, 16, 25, 34, 46], euroNumbers: [5, 11] },
    ])
  })

  it.each([
    ['a repeated main number', '4 4 20 27 49 | 2 9'],
    ['a main number out of range', '4 12 20 27 51 | 2 9'],
    ['a Euro number out of range', '4 12 20 27 49 | 2 13'],
    ['zero', '0 12 20 27 49 | 2 9'],
    ['a missing Euro number', '4 12 20 27 49 | 2'],
    ['too many separators', '4 12 | 20 27 49 | 2 9'],
    ['code instead of numbers', 'alert(1)'],
    ['broken JSON', '[{"mainNumbers": [4, 12'],
    ['JSON of the wrong shape', '{"nothing": true}'],
    [
      'a system ticket',
      JSON.stringify([{ ...ticket, mainNumbers: [1, 2, 3, 4, 5, 6] }]),
    ],
    ['nothing at all', '   '],
  ])('rejects %s', (_label, input) => {
    expect(() => parseTicketLines(input)).toThrow()
  })

  it('rejects the same line twice, whatever order it is written in', () => {
    expect(() =>
      parseTicketLines('4 12 20 27 49 | 2 9\n49 27 20 12 4 | 9 2')
    ).toThrow(/repeats an earlier line/)
  })

  it('rejects more lines than a slip holds', () => {
    const thirteen = Array.from({ length: 13 }, (_, i) => standardTicket(i + 1))
    expect(() => parseTicketLines(JSON.stringify(thirteen))).toThrow(
      /1 to 12 lines/
    )
    expect(
      parseTicketLines(JSON.stringify(thirteen.slice(0, 12)))
    ).toHaveLength(12)
  })
})

describe('formatTicketLines', () => {
  it('writes one "mains | euros" line per row', () => {
    expect(
      formatTicketLines([
        line,
        { mainNumbers: [8, 16, 25, 34, 46], euroNumbers: [5, 11] },
      ])
    ).toBe('4 12 20 27 49 | 2 9\n8 16 25 34 46 | 5 11')
  })

  it('round-trips through the parser', () => {
    const lines = [
      line,
      { mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [11, 12] },
    ]
    expect(parseTicketLines(formatTicketLines(lines))).toEqual(lines)
  })
})

describe('ticketsToStandardLines', () => {
  it('turns standard tickets into sorted lines', () => {
    const unsorted: Ticket = {
      id: 7,
      mainNumbers: [49, 4, 27, 12, 20],
      euroNumbers: [9, 2],
    }
    expect(ticketsToStandardLines([unsorted])).toEqual({
      lines: [line],
      skippedSystemTickets: 0,
      skippedOverLimit: 0,
    })
  })

  it('leaves system tickets out and says how many', () => {
    const system: Ticket = {
      id: 2,
      mainNumbers: [1, 2, 3, 4, 5, 6],
      euroNumbers: [1, 2, 3],
    }
    const result = ticketsToStandardLines([ticket, system])
    expect(result.lines).toEqual([line])
    expect(result.skippedSystemTickets).toBe(1)
  })

  it('keeps the first 12 standard tickets and counts the rest', () => {
    const tickets = Array.from({ length: 15 }, (_, i) => standardTicket(i + 1))
    const result = ticketsToStandardLines(tickets)
    expect(result.lines).toHaveLength(12)
    expect(result.lines[0]?.mainNumbers).toEqual(tickets[0]?.mainNumbers)
    expect(result.skippedOverLimit).toBe(3)
  })

  it('produces lines the parser accepts', () => {
    const tickets = Array.from({ length: 12 }, (_, i) => standardTicket(i + 1))
    const { lines } = ticketsToStandardLines(tickets)
    expect(parseTicketLines(formatTicketLines(lines))).toEqual(lines)
  })

  it('handles an empty ticket list', () => {
    expect(ticketsToStandardLines([])).toEqual({
      lines: [],
      skippedSystemTickets: 0,
      skippedOverLimit: 0,
    })
  })
})

describe('hand-over in the URL fragment', () => {
  const lines = [
    line,
    { mainNumbers: [8, 16, 25, 34, 46], euroNumbers: [5, 11] },
  ]

  it('builds a Lotto Bayern link that carries the lines', () => {
    expect(buildLottoBayernUrl(lines)).toBe(
      'https://www.lotto-bayern.de/eurojackpot/normalschein#eurojackpot=4.12.20.27.49-2.9_8.16.25.34.46-5.11'
    )
  })

  it('links to the plain form when there is nothing to carry', () => {
    expect(buildLottoBayernUrl([])).toBe(
      'https://www.lotto-bayern.de/eurojackpot/normalschein'
    )
  })

  it('round-trips through the fragment and the parser', () => {
    const hash = new URL(buildLottoBayernUrl(lines)).hash
    const handed = readHandoff(hash)
    expect(handed).not.toBeNull()
    expect(parseTicketLines(handed as string)).toEqual(lines)
  })

  it.each([
    ['no fragment', ''],
    ['an unrelated fragment', '#section-2'],
    ['another key', '#lines=4.12.20.27.49-2.9'],
    ['an empty hand-over', '#eurojackpot='],
    ['markup', '#eurojackpot=<script>alert(1)</script>'],
    ['encoded characters', '#eurojackpot=4.12%20.27'],
  ])('ignores %s', (_label, hash) => {
    expect(readHandoff(hash)).toBeNull()
  })

  it('leaves validation to the parser', () => {
    // Well-formed characters, but not a valid line
    const handed = readHandoff('#eurojackpot=4.4.20.27.99-2.9')
    expect(handed).toBe('4 4 20 27 99 | 2 9')
    expect(() => parseTicketLines(handed as string)).toThrow()
  })
})
