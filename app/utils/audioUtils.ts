// utils/audioUtils.ts

/**
 * Plays a dynamic 'win' sound using the Web Audio API.
 * The sound characteristics (pitch, repetition) change based on the ratio of winnings to cost.
 * - Small wins (winnings < cost): Single tone, pitch increases with ratio.
 * - Larger wins (winnings >= cost): Series of higher-pitched tones, repetition increases with ratio.
 * Manages the AudioContext lifecycle automatically.
 *
 * @param winnings The total amount won (must be > 0 to play sound).
 * @param cost The total cost of the tickets played.
 */
export const playWinSound = (winnings: number, cost: number): void => {
  // Only play sound if there are actual winnings.
  if (winnings <= 0) {
    // console.log("No winnings, skipping sound.");
    return
  }

  let audioContext: AudioContext | null = null

  try {
    // 1. Check for Web Audio API support and get AudioContext.
    const AudioContextClass
      = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) {
      console.warn(
        'Web Audio API is not supported in this browser. Cannot play sound.',
      )
      return
    }
    audioContext = new AudioContextClass()

    // Ensure context is resumable if it starts suspended (common in browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    // 2. Define sound parameters based on win ratio.
    // Use Infinity ratio if cost is 0 but winnings > 0 (big win scenario).
    const ratio = cost > 0 ? winnings / cost : Infinity
    const baseFrequency = 330 // E4 note - for smaller wins
    const winFrequency = 660 // E5 note (higher octave) - for bigger wins
    const maxFrequency = 990 // G5 - cap the pitch for very small wins approaching cost=1
    const durationPerTone = 0.15 // Duration of each sound pulse (seconds)
    const delayBetweenTones = 0.08 // Delay between repeated pulses (seconds)
    const baseGain = 0.2 // Base volume

    // 3. Helper function to schedule a single tone.
    /**
     * Schedules a single audio tone with a basic envelope.
     * @param frequency The pitch (Hz) of the tone.
     * @param startTime The absolute time (in audioContext.currentTime) when the tone should start.
     * @param playDuration The duration (seconds) of the tone.
     * @param gainValue The peak volume (0.0 to 1.0).
     */
    const playTone = (
      frequency: number,
      startTime: number,
      playDuration: number = durationPerTone,
      gainValue: number = baseGain,
    ): void => {
      if (!audioContext || audioContext.state === 'closed') return // Safety check

      // Create Oscillator node (generates the sound wave)
      const oscillator = audioContext.createOscillator()
      oscillator.type = 'sine' // 'sine', 'square', 'sawtooth', 'triangle'
      // Set frequency immediately (can also use setValueAtTime or linearRampToValueAtTime for pitch changes)
      oscillator.frequency.value = frequency

      // Create Gain node (controls the volume)
      const gainNode = audioContext.createGain()

      // --- Simple Volume Envelope ---
      // Start silent
      gainNode.gain.setValueAtTime(0, startTime)
      // Ramp up quickly to peak volume
      gainNode.gain.linearRampToValueAtTime(gainValue, startTime + 0.02)
      // Hold peak volume briefly (optional)
      // gainNode.gain.setValueAtTime(gainValue, startTime + 0.02 + 0.05);
      // Exponential decay to near silence (more natural fade out)
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        startTime + playDuration,
      )
      // --- End Envelope ---

      // Connect nodes: Oscillator -> Gain -> Destination (speakers)
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Schedule start and stop times for the oscillator
      oscillator.start(startTime)
      oscillator.stop(startTime + playDuration)

      // Clean up oscillator node once it finishes playing
      oscillator.onended = () => {
        oscillator.disconnect()
        gainNode.disconnect()
      }
    }

    // 4. Determine sound characteristics based on ratio and schedule tones.
    let scheduledEndTime = audioContext.currentTime // Track when the last sound will end

    if (ratio > 0 && ratio < 1) {
      // --- Small Win (Winnings < Cost) ---
      // Pitch increases as ratio approaches 1.
      const pitch = Math.min(
        baseFrequency + ratio * (winFrequency - baseFrequency),
        maxFrequency,
      )
      playTone(pitch, audioContext.currentTime)
      scheduledEndTime = audioContext.currentTime + durationPerTone
    }
    else if (ratio >= 1) {
      // --- Significant Win (Winnings >= Cost) ---
      // Play a sequence of higher-pitched tones. Repetitions increase with the win magnitude.
      // Cap repetitions to avoid excessively long sounds.
      const repetitions = Math.min(Math.ceil(ratio), 8) // More reps for bigger wins, capped at 8
      let currentStartTime = audioContext.currentTime

      for (let i = 0; i < repetitions; i++) {
        playTone(winFrequency, currentStartTime) // Use the higher 'win' frequency
        currentStartTime += durationPerTone + delayBetweenTones // Schedule next tone after a short delay
      }
      scheduledEndTime = currentStartTime - delayBetweenTones // End time is start of last tone + its duration
    }

    // 5. Schedule AudioContext closure.
    // Close the context shortly after the last sound is expected to finish playing.
    // This releases system audio resources. Add a small buffer.
    const closeDelayMs
      = (scheduledEndTime - audioContext.currentTime + 0.2) * 1000 // Delay in ms + 200ms buffer
    if (closeDelayMs > 0) {
      setTimeout(() => {
        if (audioContext && audioContext.state !== 'closed') {
          // console.log("Closing AudioContext");
          audioContext
            .close()
            .catch(e => console.error('Error closing audio context:', e))
        }
      }, closeDelayMs)
    }
    else {
      // If no sound was scheduled or duration is somehow zero/negative, close immediately.
      if (audioContext && audioContext.state !== 'closed') {
        audioContext
          .close()
          .catch(e => console.error('Error closing audio context:', e))
      }
    }
  }
  catch (e: unknown) {
    console.error(
      'Could not initialize or play win sound:',
      e instanceof Error ? e.message : String(e),
    )
    // Attempt to clean up context if creation failed mid-way (optional, error handling specific)
    if (audioContext && audioContext.state !== 'closed') {
      audioContext
        .close()
        .catch(err =>
          console.error('Error closing audio context after failure:', err),
        )
    }
  }
}
