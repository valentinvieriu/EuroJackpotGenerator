import { computed, watch } from 'vue'
import { useAudioState } from '~/composables/useAppState'
import { SOUND_LEVEL_VOLUME } from '~/utils/constants'
import {
  playSpinStart,
  playReelStop,
  playWinSound,
  playNoWinSound,
  stopSpinSound,
} from '~/utils/audioUtils'

/**
 * The slot machine's sounds, gated by the user's audio preference.
 * Every method is a no-op while sound is off, so callers never need to check.
 */
export const useMachineSounds = () => {
  const { audioEnabled, winSoundLevel } = useAudioState()

  const volume = computed(() =>
    audioEnabled.value ? SOUND_LEVEL_VOLUME[winSoundLevel.value] : 0
  )

  // Muting mid-spin silences the reels straight away
  watch(volume, (current) => {
    if (current === 0) stopSpinSound()
  })

  return {
    /** Lever pull, then the reels start to rattle */
    spinStart: () => {
      if (volume.value > 0) void playSpinStart(volume.value)
    },
    /** One reel has come to rest */
    reelStop: (reelIndex: number, reelCount: number) => {
      if (volume.value > 0)
        void playReelStop(reelIndex, reelCount, volume.value)
    },
    /** All reels are down (or the spin was abandoned) */
    spinEnd: () => stopSpinSound(),
    /** The outcome of a draw or a whole run: bells that climb with the win, or a dud */
    result: (winnings: number, cost: number) => {
      if (volume.value === 0) return
      if (winnings > 0) void playWinSound(winnings, cost, volume.value)
      else void playNoWinSound(volume.value)
    },
  }
}
