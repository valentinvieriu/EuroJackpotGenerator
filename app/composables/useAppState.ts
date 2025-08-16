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
  // Ticket generation form visibility
  const showGenerationForm = useState('show-generation-form', () => false)

  // Welcome message visibility (for shared configurations)
  const showWelcomeMessage = useState('show-welcome-message', () => false)
  const welcomeLuckyCode = useState('welcome-lucky-code', () => '')

  // Sharing dialog state
  const showSharingDialog = useState('show-sharing-dialog', () => false)
  const sharingLuckyCode = useState('sharing-lucky-code', () => '')

  // Copy success feedback
  const copySuccess = useState('copy-success', () => false)

  // Loading states for various operations
  const isGeneratingTickets = useState('is-generating-tickets', () => false)
  const currentOperation = useState<'generate' | 'simulate' | null>(
    'current-operation',
    () => null
  )

  // Actions
  const toggleGenerationForm = () => {
    showGenerationForm.value = !showGenerationForm.value
  }

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

  const setLoading = (operation: 'generate' | 'simulate' | null) => {
    currentOperation.value = operation
    isGeneratingTickets.value = operation === 'generate'
  }

  return {
    // State (readonly)
    showGenerationForm: readonly(showGenerationForm),
    showWelcomeMessage: readonly(showWelcomeMessage),
    welcomeLuckyCode: readonly(welcomeLuckyCode),
    showSharingDialog: readonly(showSharingDialog),
    sharingLuckyCode: readonly(sharingLuckyCode),
    copySuccess: readonly(copySuccess),
    isGeneratingTickets: readonly(isGeneratingTickets),
    currentOperation: readonly(currentOperation),

    // Actions
    toggleGenerationForm,
    showWelcome,
    hideWelcome,
    showSharing,
    hideSharing,
    setCopySuccess,
    setLoading,
  }
}

/**
 * Simulation panel state
 * Manages UI state specific to simulation panels
 */
export const useSimulationPanelState = () => {
  const activeMode = useState<'single' | 'montecarlo'>(
    'simulation-mode',
    () => 'single'
  )
  const singlePanelKey = useState('single-panel-key', () => 0)
  const montePanelKey = useState('monte-panel-key', () => 0)

  const setMode = (mode: 'single' | 'montecarlo') => {
    activeMode.value = mode
  }

  const refreshSinglePanel = () => {
    singlePanelKey.value++
  }

  const refreshMontePanel = () => {
    montePanelKey.value++
  }

  const refreshAllPanels = () => {
    singlePanelKey.value++
    montePanelKey.value++
  }

  return {
    activeMode: readonly(activeMode),
    singlePanelKey: readonly(singlePanelKey),
    montePanelKey: readonly(montePanelKey),
    setMode,
    refreshSinglePanel,
    refreshMontePanel,
    refreshAllPanels,
  }
}

/**
 * Debug and development state
 * Manages debugging flags and development-related state
 */
export const useDebugState = () => {
  const debugMode = useState('debug-mode', () => false)
  const showCacheStats = useState('show-cache-stats', () => false)
  const showTimings = useState('show-timings', () => false)

  const toggleDebugMode = () => {
    debugMode.value = !debugMode.value
  }

  const toggleCacheStats = () => {
    showCacheStats.value = !showCacheStats.value
  }

  const toggleTimings = () => {
    showTimings.value = !showTimings.value
  }

  return {
    debugMode: readonly(debugMode),
    showCacheStats: readonly(showCacheStats),
    showTimings: readonly(showTimings),
    toggleDebugMode,
    toggleCacheStats,
    toggleTimings,
  }
}
