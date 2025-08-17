import { logger } from '~/utils/logger'

/**
 * Premium win sound engine
 * -----------------------------------
 * Goals:
 *  - Keep intuitive "size-of-win by ear": pitch and density scale with ROI.
 *  - Sound premium: tasteful reverb, subtle chorus, compression, stereo movement.
 *  - Musical: snap to a major scale, add light harmonic richness.
 *
 * Public API preserved: playWinSound(winnings, cost, volumeMultiplier?)
 */

interface AudioSettings {
  baseFrequency: number
  winFrequency: number
  maxFrequency: number

  baseGain: number

  toneDuration: number
  toneDelay: number

  // Premium engine params
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

  panSweepPerHit: number // how far we pan per note (-1..1 range)
}

// Musical: C major scale
const MAJOR_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const

// Premium defaults tuned for "classy casino"
const AUDIO_SETTINGS: AudioSettings = {
  baseFrequency: 261.63, // C4
  winFrequency: 523.26, // C5
  maxFrequency: 1046.52, // C6

  baseGain: 0.15,

  toneDuration: 0.25,
  toneDelay: 0.12,

  dryLevel: 0.85,
  reverbLevel: 0.25,
  reverbDuration: 1.2, // seconds
  reverbDecay: 2.6,

  chorusRate: 0.85, // Hz
  chorusDepthSeconds: 0.004,
  chorusLevel: 0.18,

  compressorThreshold: -12,
  compressorKnee: 20,
  compressorRatio: 3.5,
  compressorAttack: 0.003,
  compressorRelease: 0.25,

  panSweepPerHit: 0.18,
}

/** Utility: clamp a value */
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Utility: exponential ease-out (for more natural pitch mapping below 1x ROI) */
function easeOutExpo(x: number): number {
  return x <= 0 ? 0 : 1 - Math.pow(2, -10 * x)
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

/** Snap an arbitrary frequency to the nearest pitch in a repeating major scale */
function snapToScaleFrequency(targetHz: number, rootHz: number): number {
  const semisFromRoot = 12 * Math.log2(targetHz / rootHz)
  const octave = Math.floor(semisFromRoot / 12)
  const withinOct = semisFromRoot - octave * 12

  // Find nearest degree in scale
  let nearest = MAJOR_SCALE_SEMITONES[0]
  let smallest = Infinity
  for (const deg of MAJOR_SCALE_SEMITONES) {
    const diff = Math.abs(deg - withinOct)
    if (diff < smallest) {
      smallest = diff
      nearest = deg
    }
  }
  const snappedSemis = octave * 12 + nearest
  return rootHz * Math.pow(2, snappedSemis / 12)
}

/** Per-note smooth envelope (attack/hold/decay) */
function applyEnvelope(
  gainNode: GainNode,
  startTime: number,
  peakGain: number,
  duration: number
): void {
  const attack = duration * 0.18
  const hold = duration * 0.52
  const end = startTime + duration

  gainNode.gain.cancelScheduledValues(startTime)
  gainNode.gain.setValueAtTime(0.0001, startTime)
  gainNode.gain.linearRampToValueAtTime(peakGain, startTime + attack)
  gainNode.gain.setValueAtTime(peakGain, startTime + attack + hold)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, end)
}

/** Singleton engine with shared FX & dynamics */
class AudioEngine {
  private static _instance: AudioEngine | null = null

  static get(): AudioEngine | null {
    if (typeof window === 'undefined') return null

    // Handle both standard and prefixed contexts
    const AudioContextClass =
      (
        window as unknown as {
          AudioContext?: typeof AudioContext
          webkitAudioContext?: typeof AudioContext
        }
      ).AudioContext ||
      (
        window as unknown as {
          AudioContext?: typeof AudioContext
          webkitAudioContext?: typeof AudioContext
        }
      ).webkitAudioContext
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

  private dryGain: GainNode
  private chorusDelay: DelayNode
  private chorusWet: GainNode
  private chorusLFO: OscillatorNode
  private chorusDepth: GainNode

  private reverb: ConvolverNode
  private reverbGain: GainNode

  private master: GainNode
  private compressor: DynamicsCompressorNode

  private constructor(ctx: AudioContext) {
    this.ctx = ctx

    // Shared input for all notes
    this.inputBus = ctx.createGain()

    // Dry path
    this.dryGain = ctx.createGain()
    this.dryGain.gain.value = AUDIO_SETTINGS.dryLevel

    // Chorus (LFO-modulated delay)
    this.chorusDelay = ctx.createDelay(0.05)
    this.chorusDelay.delayTime.value = 0.016 // base delay
    this.chorusWet = ctx.createGain()
    this.chorusWet.gain.value = AUDIO_SETTINGS.chorusLevel

    this.chorusLFO = ctx.createOscillator()
    this.chorusLFO.type = 'sine'
    this.chorusLFO.frequency.value = AUDIO_SETTINGS.chorusRate

    this.chorusDepth = ctx.createGain()
    this.chorusDepth.gain.value = AUDIO_SETTINGS.chorusDepthSeconds
    this.chorusLFO.connect(this.chorusDepth)
    // Modulate delay time
    this.chorusDepth.connect(this.chorusDelay.delayTime)
    this.chorusLFO.start()

    // Reverb (generated IR, plate-like)
    this.reverb = ctx.createConvolver()
    this.reverb.buffer = createReverbImpulse(
      ctx,
      AUDIO_SETTINGS.reverbDuration,
      AUDIO_SETTINGS.reverbDecay
    )
    this.reverbGain = ctx.createGain()
    this.reverbGain.gain.value = AUDIO_SETTINGS.reverbLevel

    // Dynamics & master
    this.master = ctx.createGain()
    this.master.gain.value = 1.0

    this.compressor = ctx.createDynamicsCompressor()
    this.compressor.threshold.value = AUDIO_SETTINGS.compressorThreshold
    this.compressor.knee.value = AUDIO_SETTINGS.compressorKnee
    this.compressor.ratio.value = AUDIO_SETTINGS.compressorRatio
    this.compressor.attack.value = AUDIO_SETTINGS.compressorAttack
    this.compressor.release.value = AUDIO_SETTINGS.compressorRelease

    // Wire FX bus: input → (dry, chorus, reverb) → master → compressor → destination
    this.inputBus.connect(this.dryGain)
    this.dryGain.connect(this.master)

    this.inputBus.connect(this.chorusDelay)
    this.chorusDelay.connect(this.chorusWet)
    this.chorusWet.connect(this.master)

    this.inputBus.connect(this.reverb)
    this.reverb.connect(this.reverbGain)
    this.reverbGain.connect(this.master)

    this.master.connect(this.compressor)
    this.compressor.connect(this.ctx.destination)
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

  /**
   * Play a single premium note with optional glide and pan.
   * Adds a soft harmonic fifth for richness.
   */
  playNote(options: {
    frequency: number
    startTime: number
    duration: number
    gain: number
    pan?: number // -1..1
    glideFromHz?: number | null
  }): void {
    const {
      frequency,
      startTime,
      duration,
      gain,
      pan = 0,
      glideFromHz = null,
    } = options

    const osc = this.ctx.createOscillator()
    const harm = this.ctx.createOscillator()
    const noteGain = this.ctx.createGain()

    osc.type = 'sine'
    harm.type = 'sine'
    osc.frequency.value = frequency
    harm.frequency.value = frequency * 1.5 // perfect fifth

    if (glideFromHz && glideFromHz > 0) {
      // Gentle glide up into the note
      const glideTime = Math.min(0.08, duration * 0.35)
      osc.frequency.setValueAtTime(glideFromHz, startTime)
      osc.frequency.linearRampToValueAtTime(frequency, startTime + glideTime)
      harm.frequency.setValueAtTime(glideFromHz * 1.5, startTime)
      harm.frequency.linearRampToValueAtTime(
        frequency * 1.5,
        startTime + glideTime
      )
    }

    // Envelope & relative harmonic level
    applyEnvelope(noteGain, startTime, gain, duration)
    const harmGain = this.ctx.createGain()
    applyEnvelope(harmGain, startTime, gain * 0.14, duration)

    // Stereo pan per note if available
    const hasStereoPanner = 'createStereoPanner' in this.ctx
    let panner: StereoPannerNode | null = null

    if (hasStereoPanner && Math.abs(pan) > 0.01) {
      panner = this.ctx.createStereoPanner()
      panner.pan.value = clamp(pan, -1, 1)
      // route: note → panner → bus
      noteGain.connect(panner)
      harmGain.connect(panner)
      panner.connect(this.inputBus)
    } else {
      // fallback: direct to bus
      noteGain.connect(this.inputBus)
      harmGain.connect(this.inputBus)
    }

    // Osc routing
    osc.connect(noteGain)
    harm.connect(harmGain)

    // Schedule
    osc.start(startTime)
    harm.start(startTime)
    const stopAt = startTime + duration
    osc.stop(stopAt)
    harm.stop(stopAt)

    // Cleanup
    const clean = () => {
      try {
        osc.disconnect()
        harm.disconnect()
        noteGain.disconnect()
        harmGain.disconnect()
        if (panner) panner.disconnect()
      } catch {
        // Ignore cleanup errors
      }
    }
    osc.onended = clean
    harm.onended = clean
  }

  now(): number {
    return this.ctx.currentTime
  }
}

/** Build a tasteful sequence based on ROI, returning scheduled notes */
function scheduleProgram(
  engine: AudioEngine,
  ratio: number,
  volumeMultiplier: number
): void {
  const baseGain = clamp(AUDIO_SETTINGS.baseGain * volumeMultiplier, 0, 1)
  let t = engine.now()

  if (ratio > 0 && ratio < 1) {
    // Small wins: single, smooth note; pitch tracks ratio (with ease), snapped to scale.
    const eased = easeOutExpo(ratio)
    const rawTarget =
      AUDIO_SETTINGS.baseFrequency +
      eased * (AUDIO_SETTINGS.winFrequency - AUDIO_SETTINGS.baseFrequency)
    const freq = snapToScaleFrequency(
      clamp(
        rawTarget,
        AUDIO_SETTINGS.baseFrequency,
        AUDIO_SETTINGS.maxFrequency
      ),
      AUDIO_SETTINGS.baseFrequency
    )

    engine.playNote({
      frequency: freq,
      startTime: t,
      duration: AUDIO_SETTINGS.toneDuration,
      gain: baseGain,
      pan: 0,
      glideFromHz: freq * 0.96,
    })
    return
  }

  // Significant wins: ascending sequence; more notes for bigger ROI (cap 8).
  const capped = Math.min(8, Math.ceil(ratio))
  let spacing = AUDIO_SETTINGS.toneDelay

  for (let i = 0; i < capped; i++) {
    // Slightly tighten spacing as excitement builds
    const tighten = clamp(1 - i * 0.07, 0.6, 1)
    spacing = AUDIO_SETTINGS.toneDelay * tighten

    // Ascending target that stays within a musical range, snapped to scale
    const rawTarget = AUDIO_SETTINGS.winFrequency * (1 + i * 0.055) // gentle lift per hit
    const snapped = snapToScaleFrequency(
      clamp(
        rawTarget,
        AUDIO_SETTINGS.winFrequency,
        AUDIO_SETTINGS.maxFrequency
      ),
      AUDIO_SETTINGS.baseFrequency
    )

    // Subtle pan sweep across the sequence
    const pan = (i - (capped - 1) / 2) * AUDIO_SETTINGS.panSweepPerHit // centered sweep

    // Small per-hit decay to feel natural
    const hitGain = baseGain * (1 - i * 0.06)

    engine.playNote({
      frequency: snapped,
      startTime: t,
      duration: AUDIO_SETTINGS.toneDuration,
      gain: clamp(hitGain, 0.02, 1),
      pan,
      glideFromHz: snapped * 0.97,
    })

    t += AUDIO_SETTINGS.toneDuration + spacing
  }

  // Big wins add a short flourish (sparkle arpeggio)
  if (ratio >= 3) {
    const flourishStart = t + 0.03
    const flourishDur = Math.max(0.18, AUDIO_SETTINGS.toneDuration * 0.72)
    const intervals = [0, 4, 7] // major triad
    const highRoot = AUDIO_SETTINGS.maxFrequency / 2 // around C6 region

    for (let j = 0; j < intervals.length; j++) {
      const interval = intervals[j]
      if (interval === undefined) continue
      const f = highRoot * Math.pow(2, interval / 12)
      const start = flourishStart + j * 0.07
      const pan = -0.2 + j * 0.2
      engine.playNote({
        frequency: clamp(
          f,
          AUDIO_SETTINGS.winFrequency,
          AUDIO_SETTINGS.maxFrequency
        ),
        startTime: start,
        duration: flourishDur,
        gain: clamp(baseGain * 0.9, 0, 1),
        pan,
        glideFromHz: null,
      })
    }
  }
}

/**
 * Plays a premium dynamic win sound.
 * @param winnings The total amount won (must be > 0 to play sound)
 * @param cost The total cost of the tickets played
 * @param volumeMultiplier Optional volume multiplier (0.0 to 1.0)
 */
export const playWinSound = async (
  winnings: number,
  cost: number,
  volumeMultiplier: number = 1.0
): Promise<void> => {
  try {
    if (typeof window === 'undefined') return
    if (!(winnings > 0)) return

    const engine = AudioEngine.get()
    if (!engine) {
      logger.warn('Web Audio API is not supported in this browser.')
      return
    }

    await engine.ensureRunning()

    const ratio = cost > 0 ? winnings / cost : Infinity
    const volMul = clamp(volumeMultiplier, 0, 1)

    scheduleProgram(engine, ratio, volMul)
  } catch (e: unknown) {
    logger.error(
      'Could not play premium win sound:',
      e instanceof Error ? e.message : String(e)
    )
  }
}
