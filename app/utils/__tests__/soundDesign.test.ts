import { describe, it, expect } from 'vitest'
import {
  buildWinProgram,
  buildDudProgram,
  programDuration,
  reelStopFrequency,
  winIntensity,
} from '~/utils/soundDesign'

const RATIOS = [0.05, 0.25, 0.5, 1, 2, 5, 10, 50, 100, 1000, 1_000_000]

const topPitch = (ratio: number) =>
  Math.max(...buildWinProgram(ratio).run.map((note) => note.frequency))

describe('winIntensity', () => {
  it('is zero when nothing was won', () => {
    expect(winIntensity(0)).toBe(0)
    expect(winIntensity(-5)).toBe(0)
    expect(winIntensity(Number.NaN)).toBe(0)
  })

  it('adds about one step each time a large win doubles', () => {
    expect(winIntensity(1)).toBeGreaterThan(winIntensity(0.5))
    expect(winIntensity(200) - winIntensity(100)).toBeCloseTo(1, 1)
  })
})

describe('buildWinProgram', () => {
  it('plays nothing when nothing was won', () => {
    expect(buildWinProgram(0)).toEqual({ run: [], chord: [], fanfare: [] })
  })

  it('never gets shorter or lower as the win grows', () => {
    for (let i = 1; i < RATIOS.length; i++) {
      const smaller = RATIOS[i - 1] as number
      const bigger = RATIOS[i] as number
      expect(buildWinProgram(bigger).run.length).toBeGreaterThanOrEqual(
        buildWinProgram(smaller).run.length
      )
      expect(topPitch(bigger)).toBeGreaterThanOrEqual(topPitch(smaller))
    }
  })

  it('climbs clearly higher for a real win than for a token one', () => {
    expect(buildWinProgram(1).run.length).toBeGreaterThan(
      buildWinProgram(0.1).run.length
    )
    expect(topPitch(10)).toBeGreaterThan(topPitch(1))
    expect(topPitch(1)).toBeGreaterThan(topPitch(0.1))
  })

  it('rises within a single run', () => {
    const { run } = buildWinProgram(2)
    for (let i = 1; i < run.length; i++) {
      expect(run[i]?.frequency).toBeGreaterThan(run[i - 1]?.frequency ?? 0)
      expect(run[i]?.at).toBeGreaterThan(run[i - 1]?.at ?? 0)
    }
  })

  it('withholds the resolving chord from wins smaller than the stake', () => {
    expect(buildWinProgram(0.5).chord).toHaveLength(0)
    expect(buildWinProgram(0.99).chord).toHaveLength(0)
    expect(buildWinProgram(1).chord.length).toBeGreaterThan(0)
  })

  it('saves the fanfare for big wins and doubles it for huge ones', () => {
    expect(buildWinProgram(2).fanfare).toHaveLength(0)
    const big = buildWinProgram(10).fanfare.length
    const huge = buildWinProgram(1000).fanfare.length
    expect(big).toBeGreaterThan(0)
    expect(huge).toBe(big * 2)
  })

  it('stays bounded for absurd ratios', () => {
    const program = buildWinProgram(Infinity)
    expect(program.run.length).toBeLessThanOrEqual(20)
    expect(programDuration(program)).toBeLessThan(5)
    for (const note of [...program.run, ...program.chord, ...program.fanfare]) {
      expect(note.frequency).toBeLessThan(4000)
      expect(note.gain).toBeGreaterThan(0)
      expect(note.gain).toBeLessThanOrEqual(1)
    }
  })

  it('starts the chord only after the run has finished climbing', () => {
    const { run, chord } = buildWinProgram(3)
    const lastRunNote = run.at(-1)
    expect(chord[0]?.at).toBeGreaterThan(lastRunNote?.at ?? 0)
  })
})

describe('reel stops and duds', () => {
  it('steps up with every reel', () => {
    for (let reel = 1; reel < 7; reel++) {
      expect(reelStopFrequency(reel)).toBeGreaterThan(
        reelStopFrequency(reel - 1)
      )
    }
  })

  it('plays a short falling figure for a draw that won nothing', () => {
    const dud = buildDudProgram()
    expect(dud).toHaveLength(2)
    expect(dud[1]?.frequency).toBeLessThan(dud[0]?.frequency ?? 0)
    expect(dud[1]?.frequency).toBeLessThan(
      buildWinProgram(0.05).run[0]?.frequency ?? 0
    )
  })
})
