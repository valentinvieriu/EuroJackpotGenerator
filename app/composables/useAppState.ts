/**
 * SSR-safe composables for ephemeral application state
 * Uses Nuxt's useState for server-side rendering compatibility
 */
import {
  WELCOME_DISPLAY_MS,
  TRANSIENT_ERROR_MS,
  COPY_SUCCESS_MS,
} from '~/utils/constants'

/**
 * Audio preferences state
 * Manages user's audio notification preferences
 */
export const useAudioState = () => {
  const audioEnabled = useState('audio-enabled', () => true)
  const winSoundLevel = useState<'none' | 'low' | 'medium' | 'high'>(
    'win-sound-level',
    () => 'medium'
  )

  const toggleAudio = () => {
    audioEnabled.value = !audioEnabled.value
  }

  const setWinSoundLevel = (level: 'none' | 'low' | 'medium' | 'high') => {
    winSoundLevel.value = level
  }

  return {
    audioEnabled: readonly(audioEnabled),
    winSoundLevel: readonly(winSoundLevel),
    toggleAudio,
    setWinSoundLevel,
  }
}

/**
 * Transient error state management
 * Manages temporary errors that should not persist across page reloads
 */
export const useTransientErrors = () => {
  const errors = useState<string[]>('transient-errors', () => [])
  const lastErrorId = useState('last-error-id', () => 0)

  const addError = (message: string, duration = TRANSIENT_ERROR_MS): number => {
    const errorId = ++lastErrorId.value
    errors.value.push(message)

    // Auto-remove error after duration
    if (duration > 0 && import.meta.client) {
      setTimeout(() => {
        removeError(message)
      }, duration)
    }

    return errorId
  }

  const removeError = (message: string) => {
    const index = errors.value.indexOf(message)
    if (index > -1) {
      errors.value.splice(index, 1)
    }
  }

  const clearErrors = () => {
    errors.value = []
  }

  const hasErrors = computed(() => errors.value.length > 0)

  return {
    errors: readonly(errors),
    hasErrors,
    addError,
    removeError,
    clearErrors,
  }
}

/**
 * UI state for various toggles and temporary states
 * Manages ephemeral UI state that should be SSR-safe
 */
export const useUIState = () => {
  // Welcome message visibility (for shared configurations)
  const showWelcomeMessage = useState('show-welcome-message', () => false)
  const welcomeLuckyCode = useState('welcome-lucky-code', () => '')

  // Sharing dialog state
  const showSharingDialog = useState('show-sharing-dialog', () => false)
  const sharingLuckyCode = useState('sharing-lucky-code', () => '')

  // Copy success feedback
  const copySuccess = useState('copy-success', () => false)

  // Actions
  const showWelcome = (luckyCode: string, duration = WELCOME_DISPLAY_MS) => {
    welcomeLuckyCode.value = luckyCode
    showWelcomeMessage.value = true

    // Auto-hide after duration
    if (duration > 0 && import.meta.client) {
      setTimeout(() => {
        hideWelcome()
      }, duration)
    }
  }

  const hideWelcome = () => {
    showWelcomeMessage.value = false
    welcomeLuckyCode.value = ''
  }

  const showSharing = (luckyCode: string) => {
    sharingLuckyCode.value = luckyCode
    showSharingDialog.value = true
  }

  const hideSharing = () => {
    showSharingDialog.value = false
    sharingLuckyCode.value = ''
    copySuccess.value = false
  }

  const setCopySuccess = (duration = COPY_SUCCESS_MS) => {
    copySuccess.value = true

    if (duration > 0 && import.meta.client) {
      setTimeout(() => {
        copySuccess.value = false
      }, duration)
    }
  }

  return {
    // State (readonly)
    showWelcomeMessage: readonly(showWelcomeMessage),
    welcomeLuckyCode: readonly(welcomeLuckyCode),
    showSharingDialog: readonly(showSharingDialog),
    sharingLuckyCode: readonly(sharingLuckyCode),
    copySuccess: readonly(copySuccess),

    // Actions
    showWelcome,
    hideWelcome,
    showSharing,
    hideSharing,
    setCopySuccess,
  }
}

/**
 * Simulation panel state
 * Manages UI state specific to the slot machine and its panels
 */
export const useSimulationPanelState = () => {
  // False while the reels are still spinning, so results aren't spoiled before they land
  const drawRevealed = useState('draw-revealed', () => true)

  const setDrawRevealed = (revealed: boolean) => {
    drawRevealed.value = revealed
  }

  return {
    drawRevealed: readonly(drawRevealed),
    setDrawRevealed,
  }
}
