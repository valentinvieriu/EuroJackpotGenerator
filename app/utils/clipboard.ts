/**
 * Copy text to the clipboard, with a fallback for browsers (or insecure
 * contexts) where the async Clipboard API is unavailable.
 * Rejects if the text could not be copied.
 */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  textArea.style.top = '-999999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()

  try {
    if (!document.execCommand('copy')) {
      throw new Error('Copy command was rejected')
    }
  } finally {
    document.body.removeChild(textArea)
  }
}
