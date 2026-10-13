import { ref, onMounted } from 'vue'
import { BOOKMARKLET_URL_PATH } from '~/utils/constants'

type LoadState = 'loading' | 'ready' | 'missing'

/**
 * The bookmarklet's `javascript:` URL, as built into public/ by
 * `npm run bookmarklet:build`. Loaded in the browser only: it is an
 * installable link, not something to render on the server.
 */
export const useBookmarkletUrl = () => {
  const url = ref('')
  const state = ref<LoadState>('loading')

  onMounted(async () => {
    try {
      const text = (
        await $fetch<string>(BOOKMARKLET_URL_PATH, { responseType: 'text' })
      ).trim()
      // A missing file falls through to the app shell, which is HTML, not a bookmark
      if (!text.startsWith('javascript:')) throw new Error('Not a bookmark URL')
      url.value = text
      state.value = 'ready'
    } catch {
      state.value = 'missing'
    }
  })

  return { url, state }
}
