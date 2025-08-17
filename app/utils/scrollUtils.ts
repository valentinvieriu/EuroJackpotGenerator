/**
 * Scroll utilities for smooth navigation within the application
 */

/**
 * Smoothly scroll to an element with the given selector
 * @param selector - CSS selector for the target element
 * @param offset - Optional offset in pixels from the top (default: 20)
 * @param behavior - Scroll behavior (default: 'smooth')
 */
export const scrollToElement = (
  selector: string,
  offset = 20,
  behavior: ScrollBehavior = 'smooth'
): void => {
  if (typeof window === 'undefined') return

  const element = document.querySelector(selector)
  if (!element) {
    console.warn(`Element with selector "${selector}" not found for scrolling`)
    return
  }

  const elementRect = element.getBoundingClientRect()
  const absoluteElementTop = elementRect.top + window.pageYOffset
  const targetPosition = absoluteElementTop - offset

  window.scrollTo({
    top: targetPosition,
    behavior,
  })
}

/**
 * Scroll to the custom form area
 * Uses a delay to ensure the DOM has updated after mode changes
 */
export const scrollToCustomForm = (delay = 100): void => {
  setTimeout(() => {
    // Try multiple selectors in order of preference
    const selectors = [
      '[data-custom-form]', // Preferred: data attribute
      '.custom-form', // Fallback: class name
      'form', // Last resort: first form element
    ]

    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        scrollToElement(selector, 80) // Extra offset for better visibility
        break
      }
    }
  }, delay)
}

/**
 * Scroll to the top of the page
 */
export const scrollToTop = (behavior: ScrollBehavior = 'smooth'): void => {
  if (typeof window === 'undefined') return

  window.scrollTo({
    top: 0,
    behavior,
  })
}
