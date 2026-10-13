import { logger } from '~/utils/logger'
import {
  buildWinProgram,
  buildDudProgram,
  reelStopFrequency,
  type SoundNote,
} from '~/utils/soundDesign'

/**
 * Slot machine sound engine
 * -----------------------------------
 * Everything is synthesised with the Web Audio API; there are no audio files.
 *
 *  - Spin: a lever clack, then a reel ratchet that thins out as reels stop.
 *  - Reel stop: a mechanical thunk plus a soft note, one rung higher per reel.
 *  - Win: a run of coin-bells that climbs higher and longer the more you win
 *    (the mapping lives in soundDesign.ts).
 *  - No win: a quiet low dud.
 *
 * All notes share one FX chain (chorus, reverb, compressor) so they sit together.
 */

interface AudioSettings {
  /** Loudness of a full-gain note before the volume multiplier */
  baseGain: number

  dryLevel: number
  reverbLevel: number
  reverbDuration: number
  reverbDecay: number

  chorusRate: number
  chorusDepthSeconds: number
  chorusLevel: number

  compressorThreshold: number
  compressorKnee: number
  compressorRatio: number
  compressorAttack: number
  compressorRelease: number

  /** Stereo spread of the reels, left to right (-1..1) */
  reelPanSpread: number
  /** Clicks per second of the spinning-reel ratchet */
  ratchetRate: number
  /** Safety net: the ratchet never runs longer than this */
  ratchetMaxSeconds: number
}

const AUDIO_SETTINGS: AudioSettings = {
  baseGain: 0.16,

  dryLevel: 0.85,
  reverbLevel: 0.22,
  reverbDuration: 1.2, // seconds
  reverbDecay: 2.6,

  chorusRate: 0.85, // Hz
  chorusDepthSeconds: 0.004,
  chorusLevel: 0.14,

  compressorThreshold: -12,
  compressorKnee: 20,
  compressorRatio: 3.5,
  compressorAttack: 0.003,
  compressorRelease: 0.25,

  reelPanSpread: 0.5,
  ratchetRate: 26,
  ratchetMaxSeconds: 8,
}

/** Bell timbre: the fundamental plus two inharmonic partials, as struck metal has */
const BELL_PARTIALS = [
  { ratio: 1, level: 1 },
  { ratio: 2.756, level: 0.32 },
  { ratio: 5.404, level: 0.1 },
] as const

const SILENT = 0.0001

/** Utility: clamp a value */
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Create a reverb impulse (Schroeder-style: decaying noise) */
function createReverbImpulse(
  context: AudioContext,
  durationSec: number,
  decay: number
): AudioBuffer {
  const rate = context.sampleRate
  const length = Math.max(1, Math.floor(durationSec * rate))
  const impulse = context.createBuffer(2, length, rate)

  for (let ch = 0; ch < impulse.numberOfChannels; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      // exponential decay envelope over white noise
      const t = i / length
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay)
    }
  }
  return impulse
}

/** One second of white noise: the raw material for clicks, thunks and the ratchet */
function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

interface Ratchet {
  source: AudioBufferSourceNode
  lfo: OscillatorNode
  out: GainNode
  level: number
}

/** Singleton engine with shared FX & dynamics */
class AudioEngine {
  private static _instance: AudioEngine | null = null

  static get(): AudioEngine | null {
    if (typeof window === 'undefined') return null

    // Handle both standard and prefixed contexts
    const audioWindow = window as unknown as {
      AudioContext?: typeof AudioContext
      webkitAudioContext?: typeof AudioContext
    }
    const AudioContextClass =
      audioWindow.AudioContext || audioWindow.webkitAudioContext
    if (!AudioContextClass) return null

    if (!this._instance) {
      try {
        this._instance = new AudioEngine(new AudioContextClass())
      } catch (e) {
        logger.warn('Could not initialize AudioContext:', e)
        return null
      }
    }
    return this._instance
  }

  private ctx: AudioContext
  private inputBus: GainNode
  private master: GainNode
  private noise: AudioBuffer
  private ratchet: Ratchet | null = null

  private constructor(ctx: AudioContext) {
    this.ctx = ctx
    this.noise = createNoiseBuffer(ctx)

    // Shared input for all notes
    this.inputBus = ctx.createGain()

    // Dry path
    const dryGain = ctx.createGain()
    dryGain.gain.value = AUDIO_SETTINGS.dryLevel

    // Chorus (LFO-modulated delay)
    const chorusDelay = ctx.createDelay(0.05)
    chorusDelay.delayTime.value = 0.016 // base delay
    const chorusWet = ctx.createGain()
    chorusWet.gain.value = AUDIO_SETTINGS.chorusLevel

    const chorusLFO = ctx.createOscillator()
    chorusLFO.type = 'sine'
    chorusLFO.frequency.value = AUDIO_SETTINGS.chorusRate
    const chorusDepth = ctx.createGain()
    chorusDepth.gain.value = AUDIO_SETTINGS.chorusDepthSeconds
    chorusLFO.connect(chorusDepth)
    chorusDepth.connect(chorusDelay.delayTime)
    chorusLFO.start()

    // Reverb (generated IR, plate-like)
    const reverb = ctx.createConvolver()
    reverb.buffer = createReverbImpulse(
      ctx,
      AUDIO_SETTINGS.reverbDuration,
      AUDIO_SETTINGS.reverbDecay
    )
    const reverbGain = ctx.createGain()
    reverbGain.gain.value = AUDIO_SETTINGS.reverbLevel

    // Dynamics & master
    this.master = ctx.createGain()
    this.master.gain.value = 1.0

    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = AUDIO_SETTINGS.compressorThreshold
    compressor.knee.value = AUDIO_SETTINGS.compressorKnee
    compressor.ratio.value = AUDIO_SETTINGS.compressorRatio
    compressor.attack.value = AUDIO_SETTINGS.compressorAttack
    compressor.release.value = AUDIO_SETTINGS.compressorRelease

    // Wire FX bus: input → (dry, chorus, reverb) → master → compressor → destination
    this.inputBus.connect(dryGain)
    dryGain.connect(this.master)

    this.inputBus.connect(chorusDelay)
    chorusDelay.connect(chorusWet)
    chorusWet.connect(this.master)

    this.inputBus.connect(reverb)
    reverb.connect(reverbGain)
    reverbGain.connect(this.master)

    this.master.connect(compressor)
    compressor.connect(this.ctx.destination)
  }

  /** Ensure audio is running (autoplay policies may start suspended) */
  async ensureRunning(): Promise<void> {
    try {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume()
      }
    } catch (e) {
      logger.warn('AudioContext resume failed:', e)
    }
  }

  now(): number {
    return this.ctx.currentTime
  }

  /** Route a voice into the FX bus, through a panner when it sits off-centre */
  private output(pan: number): { node: AudioNode; panner: AudioNode | null } {
    if ('createStereoPanner' in this.ctx && Math.abs(pan) > 0.01) {
      const panner = this.ctx.createStereoPanner()
      panner.pan.value = clamp(pan, -1, 1)
      panner.connect(this.inputBus)
      return { node: panner, panner }
    }
    return { node: this.inputBus, panner: null }
  }

  /**
   * A struck bell: instant attack, exponential ring-out, inharmonic partials.
   * This is the coin sound; pitch carries the size of the win.
   */
  playBell(options: {
    frequency: number
    startTime: number
    duration: number
    gain: number
    pan?: number
  }): void {
    const { frequency, startTime, duration, gain, pan = 0 } = options
    const { node: out, panner } = this.output(pan)
    const end = startTime + duration
    const nodes: AudioNode[] = panner ? [panner] : []

    BELL_PARTIALS.forEach(({ ratio, level }, i) => {
      const osc = this.ctx.createOscillator()
      const env = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency * ratio

      // Higher partials die away faster, as they do in real metal
      const ringOut = startTime + duration / (1 + i * 0.9)
      env.gain.setValueAtTime(SILENT, startTime)
      env.gain.linearRampToValueAtTime(gain * level, startTime + 0.004)
      env.gain.exponentialRampToValueAtTime(SILENT, ringOut)

      osc.connect(env)
      env.connect(out)
      osc.start(startTime)
      osc.stop(end)
      nodes.push(osc, env)
    })

    this.cleanupAfter(nodes[panner ? 1 : 0] as OscillatorNode, nodes)
  }

  /** A plain soft tone, for sounds that should not sparkle (the dud) */
  playTone(options: {
    frequency: number
    startTime: number
    duration: number
    gain: number
  }): void {
    const { frequency, startTime, duration, gain } = options
    const osc = this.ctx.createOscillator()
    const env = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = frequency

    env.gain.setValueAtTime(SILENT, startTime)
    env.gain.linearRampToValueAtTime(gain, startTime + duration * 0.15)
    env.gain.exponentialRampToValueAtTime(SILENT, startTime + duration)

    osc.connect(env)
    env.connect(this.inputBus)
    osc.start(startTime)
    osc.stop(startTime + duration)
    this.cleanupAfter(osc, [osc, env])
  }

  /** A burst of filtered noise: the mechanical part of clicks and thunks */
  playNoise(options: {
    startTime: number
    duration: number
    gain: number
    filter: BiquadFilterType
    frequency: number
    q?: number
    pan?: number
  }): void {
    const {
      startTime,
      duration,
      gain,
      filter,
      frequency,
      q = 1,
      pan = 0,
    } = options
    const { node: out, panner } = this.output(pan)

    const source = this.ctx.createBufferSource()
    source.buffer = this.noise
    const biquad = this.ctx.createBiquadFilter()
    biquad.type = filter
    biquad.frequency.value = frequency
    biquad.Q.value = q
    const env = this.ctx.createGain()
    env.gain.setValueAtTime(gain, startTime)
    env.gain.exponentialRampToValueAtTime(SILENT, startTime + duration)

    source.connect(biquad)
    biquad.connect(env)
    env.connect(out)
    // Start at a random point so repeated bursts don't sound identical
    source.start(startTime, Math.random() * 0.5)
    source.stop(startTime + duration)
    this.cleanupAfter(source, [
      source,
      biquad,
      env,
      ...(panner ? [panner] : []),
    ])
  }

  /** A low pitched knock that drops in pitch: gives clicks their weight */
  playThump(options: {
    startTime: number
    frequency: number
    duration: number
    gain: number
    pan?: number
  }): void {
    const { startTime, frequency, duration, gain, pan = 0 } = options
    const { node: out, panner } = this.output(pan)
    const osc = this.ctx.createOscillator()
    const env = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(frequency * 1.8, startTime)
    osc.frequency.exponentialRampToValueAtTime(frequency, startTime + duration)
    env.gain.setValueAtTime(gain, startTime)
    env.gain.exponentialRampToValueAtTime(SILENT, startTime + duration)

    osc.connect(env)
    env.connect(out)
    osc.start(startTime)
    osc.stop(startTime + duration)
    this.cleanupAfter(osc, [osc, env, ...(panner ? [panner] : [])])
  }

  /**
   * The spinning reels: band-passed noise chopped by a square wave into a fast
   * ratchet. Runs until stopRatchet(); bypasses the reverb so it stays tight.
   */
  startRatchet(level: number): void {
    this.stopRatchet(0)
    const t = this.ctx.currentTime

    const source = this.ctx.createBufferSource()
    source.buffer = this.noise
    source.loop = true

    const band = this.ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 1700
    band.Q.value = 1.4

    // Gain swings 0..1 at the ratchet rate
    const chop = this.ctx.createGain()
    chop.gain.value = 0.5
    const lfo = this.ctx.createOscillator()
    lfo.type = 'square'
    lfo.frequency.value = AUDIO_SETTINGS.ratchetRate
    const lfoDepth = this.ctx.createGain()
    lfoDepth.gain.value = 0.5
    lfo.connect(lfoDepth)
    lfoDepth.connect(chop.gain)

    const out = this.ctx.createGain()
    out.gain.setValueAtTime(SILENT, t)
    out.gain.exponentialRampToValueAtTime(Math.max(SILENT, level), t + 0.06)

    source.connect(band)
    band.connect(chop)
    chop.connect(out)
    out.connect(this.master)

    source.start(t)
    lfo.start(t)
    source.stop(t + AUDIO_SETTINGS.ratchetMaxSeconds)
    lfo.stop(t + AUDIO_SETTINGS.ratchetMaxSeconds)

    const ratchet: Ratchet = { source, lfo, out, level }
    this.ratchet = ratchet
    source.onended = () => {
      for (const node of [source, band, chop, lfo, lfoDepth, out]) {
        try {
          node.disconnect()
        } catch {
          // Ignore cleanup errors
        }
      }
      if (this.ratchet === ratchet) this.ratchet = null
    }
  }

  /** Thin the ratchet out as reels stop: 1 = all spinning, 0 = silent */
  setRatchetLevel(fraction: number): void {
    if (!this.ratchet) return
    const target = Math.max(SILENT, this.ratchet.level * clamp(fraction, 0, 1))
    this.ratchet.out.gain.setTargetAtTime(target, this.ctx.currentTime, 0.03)
  }

  stopRatchet(fadeSeconds = 0.12): void {
    const ratchet = this.ratchet
    if (!ratchet) return
    this.ratchet = null
    const t = this.ctx.currentTime
    try {
      ratchet.out.gain.cancelScheduledValues(t)
      ratchet.out.gain.setTargetAtTime(
        SILENT,
        t,
        Math.max(0.005, fadeSeconds / 4)
      )
      // Slowing the chop as it fades reads as the mechanism winding down
      ratchet.lfo.frequency.setTargetAtTime(
        AUDIO_SETTINGS.ratchetRate / 3,
        t,
        Math.max(0.005, fadeSeconds / 2)
      )
      ratchet.source.stop(t + fadeSeconds + 0.05)
      ratchet.lfo.stop(t + fadeSeconds + 0.05)
    } catch {
      // Already stopped
    }
  }

  /** Disconnect a voice's nodes once its source has finished */
  private cleanupAfter(
    source: AudioScheduledSourceNode,
    nodes: AudioNode[]
  ): void {
    source.onended = () => {
      for (const node of nodes) {
        try {
          node.disconnect()
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }
}

/** Run a sound against a ready engine; never lets an audio failure reach the UI */
async function withEngine(
  label: string,
  play: (engine: AudioEngine) => void
): Promise<void> {
  try {
    const engine = AudioEngine.get()
    if (!engine) return
    await engine.ensureRunning()
    play(engine)
  } catch (e: unknown) {
    logger.error(
      `Could not play ${label} sound:`,
      e instanceof Error ? e.message : String(e)
    )
  }
}

const voiceGain = (noteGain: number, volumeMultiplier: number) =>
  clamp(
    AUDIO_SETTINGS.baseGain * noteGain * clamp(volumeMultiplier, 0, 1),
    0,
    1
  )

const playBells = (
  engine: AudioEngine,
  notes: SoundNote[],
  volumeMultiplier: number,
  spread = 0
) => {
  const start = engine.now()
  notes.forEach((note, i) => {
    engine.playBell({
      frequency: note.frequency,
      startTime: start + note.at,
      duration: note.duration,
      gain: voiceGain(note.gain, volumeMultiplier),
      // Sweep left to right across the run
      pan: notes.length > 1 ? spread * ((i / (notes.length - 1)) * 2 - 1) : 0,
    })
  })
}

/**
 * Lever pull and the start of the reel ratchet.
 * Call stopSpinSound() when the reels have stopped.
 */
export const playSpinStart = (volumeMultiplier: number = 1.0): Promise<void> =>
  withEngine('spin', (engine) => {
    const t = engine.now()
    // Lever: a sharp clack with a low knock under it
    engine.playNoise({
      startTime: t,
      duration: 0.05,
      gain: voiceGain(1.1, volumeMultiplier),
      filter: 'bandpass',
      frequency: 900,
      q: 0.8,
    })
    engine.playThump({
      startTime: t,
      frequency: 70,
      duration: 0.14,
      gain: voiceGain(1.4, volumeMultiplier),
    })
    engine.startRatchet(voiceGain(0.45, volumeMultiplier))
  })

/**
 * One reel coming to rest: a thunk, plus a note one rung higher than the last reel's.
 * @param reelIndex Zero-based reel, left to right
 * @param reelCount Total number of reels, used to thin out the ratchet
 */
export const playReelStop = (
  reelIndex: number,
  reelCount: number,
  volumeMultiplier: number = 1.0
): Promise<void> =>
  withEngine('reel stop', (engine) => {
    const t = engine.now()
    const position = reelCount > 1 ? reelIndex / (reelCount - 1) : 0.5
    const pan = AUDIO_SETTINGS.reelPanSpread * (position * 2 - 1)

    engine.playNoise({
      startTime: t,
      duration: 0.06,
      gain: voiceGain(0.9, volumeMultiplier),
      filter: 'lowpass',
      frequency: 420,
      pan,
    })
    engine.playThump({
      startTime: t,
      frequency: 95,
      duration: 0.09,
      gain: voiceGain(1.1, volumeMultiplier),
      pan,
    })
    engine.playBell({
      frequency: reelStopFrequency(reelIndex),
      startTime: t + 0.005,
      duration: 0.28,
      gain: voiceGain(0.55, volumeMultiplier),
      pan,
    })

    engine.setRatchetLevel(1 - (reelIndex + 1) / reelCount)
  })

/** Silence the reel ratchet. Safe to call when nothing is spinning. */
export const stopSpinSound = (): void => {
  try {
    AudioEngine.get()?.stopRatchet()
  } catch {
    // Nothing to stop
  }
}

/**
 * Plays the win sound: a coin-bell run that climbs higher and longer the more
 * was won relative to the stake.
 * @param winnings The total amount won (must be > 0 to play sound)
 * @param cost The total cost of the tickets played
 * @param volumeMultiplier Optional volume multiplier (0.0 to 1.0)
 */
export const playWinSound = (
  winnings: number,
  cost: number,
  volumeMultiplier: number = 1.0
): Promise<void> => {
  if (!(winnings > 0)) return Promise.resolve()
  const program = buildWinProgram(cost > 0 ? winnings / cost : Infinity)

  return withEngine('win', (engine) => {
    playBells(engine, program.run, volumeMultiplier, 0.35)
    playBells(engine, program.chord, volumeMultiplier)
    playBells(engine, program.fanfare, volumeMultiplier, 0.5)
  })
}

/** The quiet dud for a draw that won nothing. */
export const playNoWinSound = (volumeMultiplier: number = 1.0): Promise<void> =>
  withEngine('no-win', (engine) => {
    const start = engine.now()
    for (const note of buildDudProgram()) {
      engine.playTone({
        frequency: note.frequency,
        startTime: start + note.at,
        duration: note.duration,
        gain: voiceGain(note.gain, volumeMultiplier),
      })
    }
  })
