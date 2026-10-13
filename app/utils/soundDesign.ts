/**
 * Sound design for the slot machine: decides WHAT is played for a given outcome.
 * Pure data in, pure data out; synthesis lives in audioUtils.ts.
 *
 * The win sound is a run of coin-bells climbing a pentatonic ladder. The bigger
 * the win relative to the stake, the longer the run and the higher it climbs.
 * Only a win that covers the stake earns the resolving chord, so a "win" that
 * is really a loss sounds unfinished.
 */

export interface SoundNote {
  /** Pitch in Hz */
  frequency: number
  /** Start offset in seconds from the beginning of the program */
  at: number
  /** Ring-out time in seconds */
  duration: number
  /** Relative loudness, 0..1 */
  gain: number
}

export interface WinProgram {
  /** Ascending coin-bell run */
  run: SoundNote[]
  /** Resolving chord, only when the win covers the stake */
  chord: SoundNote[]
  /** Arpeggio flourish for big wins */
  fanfare: SoundNote[]
}

const C4_HZ = 261.63
const RUN_ROOT_HZ = C4_HZ * 2 // C5
const PENTATONIC_SEMITONES = [0, 2, 4, 7, 9] as const
const MAJOR_TRIAD_SEMITONES = [0, 4, 7] as const

const RUN_MIN_NOTES = 2
const RUN_MAX_NOTES = 20
/** The ladder tops out two octaves above the root (C7); longer runs trill there */
const RUN_TOP_SEMITONES = 24
const RUN_TRILL_SEMITONES = 19
const RUN_FIRST_GAP_S = 0.078
const RUN_MIN_GAP_S = 0.045
const RUN_GAP_TIGHTEN = 0.96
const RUN_NOTE_S = 0.22

/** Win ÷ stake at which each extra layer kicks in */
const CHORD_FROM_RATIO = 1
const FANFARE_FROM_RATIO = 5
const DOUBLE_FANFARE_FROM_RATIO = 100
/** Keeps the chord's top note at C7 even when the run trills at the top */
const CHORD_MAX_ROOT_SEMITONES = 12
const FANFARE_GAP_S = 0.09
const FANFARE_TOP_SEMITONES = 31

const semitonesToHz = (rootHz: number, semitones: number) =>
  rootHz * 2 ** (semitones / 12)

/**
 * How big a win feels, on a log scale: each doubling of the win adds roughly
 * one step. 0 for no win, ~2.3 at break-even, ~5.4 at 10× the stake.
 */
export function winIntensity(ratio: number): number {
  if (!(ratio > 0)) return 0
  return Math.log2(1 + 4 * ratio)
}

/** Semitones above the root for the n-th rung of the pentatonic ladder */
function ladderSemitones(step: number): number {
  const octave = Math.floor(step / PENTATONIC_SEMITONES.length)
  const degree = PENTATONIC_SEMITONES[step % PENTATONIC_SEMITONES.length] ?? 0
  const semitones = octave * 12 + degree
  if (semitones <= RUN_TOP_SEMITONES) return semitones
  // Past the top: alternate between the top note and the fifth below (coin shower)
  return step % 2 === 0 ? RUN_TOP_SEMITONES : RUN_TRILL_SEMITONES
}

/**
 * Build the win sound for a win-to-stake ratio (winnings ÷ cost).
 * Returns an empty program when nothing was won.
 */
export function buildWinProgram(ratio: number): WinProgram {
  const program: WinProgram = { run: [], chord: [], fanfare: [] }
  if (!(ratio > 0)) return program

  const intensity = winIntensity(ratio)
  const noteCount = Math.min(
    RUN_MAX_NOTES,
    Math.max(RUN_MIN_NOTES, Math.round(1 + 2 * intensity))
  )

  let at = 0
  let highest = 0
  for (let step = 0; step < noteCount; step++) {
    const semitones = ladderSemitones(step)
    highest = Math.max(highest, semitones)
    program.run.push({
      frequency: semitonesToHz(RUN_ROOT_HZ, semitones),
      at,
      duration: RUN_NOTE_S,
      // Gentle crescendo towards the top of the run
      gain: 0.75 + 0.25 * (step / Math.max(1, noteCount - 1)),
    })
    at += Math.max(RUN_MIN_GAP_S, RUN_FIRST_GAP_S * RUN_GAP_TIGHTEN ** step)
  }

  if (ratio < CHORD_FROM_RATIO) return program

  // Resolve on the highest tonic the run reached
  const chordRoot = Math.min(
    CHORD_MAX_ROOT_SEMITONES,
    Math.floor(highest / 12) * 12
  )
  const chordDuration = 0.7 + 0.1 * Math.min(intensity, 8)
  for (const interval of [...MAJOR_TRIAD_SEMITONES, 12]) {
    program.chord.push({
      frequency: semitonesToHz(RUN_ROOT_HZ, chordRoot + interval),
      at,
      duration: chordDuration,
      gain: 0.8,
    })
  }

  if (ratio < FANFARE_FROM_RATIO) return program

  const passes = ratio >= DOUBLE_FANFARE_FROM_RATIO ? 2 : 1
  const arpeggio = [0, 4, 7, 12, 16, 19]
  let fanfareAt = at + 0.2
  for (let pass = 0; pass < passes; pass++) {
    for (const interval of arpeggio) {
      program.fanfare.push({
        frequency: semitonesToHz(
          RUN_ROOT_HZ,
          Math.min(FANFARE_TOP_SEMITONES, pass * 12 + interval)
        ),
        at: fanfareAt,
        duration: 0.3,
        gain: 0.85,
      })
      fanfareAt += FANFARE_GAP_S
    }
  }

  return program
}

/** Total length of a win program in seconds, including the last note's ring-out */
export function programDuration(program: WinProgram): number {
  return [...program.run, ...program.chord, ...program.fanfare].reduce(
    (end, note) => Math.max(end, note.at + note.duration),
    0
  )
}

/**
 * Pitch of the note played as a reel stops. Each reel lands one rung higher
 * than the last, so the stops build towards the result.
 */
export function reelStopFrequency(reelIndex: number): number {
  return semitonesToHz(C4_HZ, ladderSemitones(Math.max(0, reelIndex)))
}

/** The quiet "nothing" played for a draw that won nothing: two low falling notes */
export function buildDudProgram(): SoundNote[] {
  return [
    { frequency: semitonesToHz(C4_HZ, -8), at: 0, duration: 0.14, gain: 0.5 },
    {
      frequency: semitonesToHz(C4_HZ, -12),
      at: 0.11,
      duration: 0.2,
      gain: 0.45,
    },
  ]
}
