// Define an enum for draw types for better type safety and readability
export enum EurojackpotDrawType {
  PREVIOUS = 'previous',
  NEXT = 'next',
}

/**
 * Calculates the ISO 8601 week number for a given date.
 * ISO 8601 weeks start on Monday. Week 1 is the first week with a Thursday in the new year.
 *
 * @param date The input date.
 * @returns The ISO 8601 week number (1-53).
 */
function getISOWeekNumber(date: Date): number {
  // Create a copy to avoid modifying the original date
  const target = new Date(date.valueOf())

  // Calculate the day number (0=Sunday, 1=Monday,..., 6=Saturday)
  // Adjust to make Monday=0, Sunday=6
  const dayNr = (date.getDay() + 6) % 7

  // Set the target to the Thursday of the current week
  target.setDate(target.getDate() - dayNr + 3)

  // Get the first Thursday of the year
  const firstThursday = new Date(target.getFullYear(), 0, 4) // January 4th is always in week 1

  // Adjust firstThursday to be the Thursday of week 1
  firstThursday.setDate(
    firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3
  )

  // Calculate the difference in weeks
  // getTime() returns milliseconds since epoch
  const diffInMilliseconds = target.getTime() - firstThursday.getTime()
  const weeks = Math.ceil(diffInMilliseconds / (7 * 24 * 60 * 60 * 1000)) + 1 // Add 1 because week numbering starts at 1

  return weeks
}

/**
 * Finds the date of the closest EuroJackpot draw (Tuesday or Friday) relative to a given date.
 *
 * @param referenceDate The date from which to find the draw date.
 * @param type Specifies whether to find the 'previous' or 'next' draw date.
 * @returns The Date object representing the relevant draw date.
 */
function getDrawDate(referenceDate: Date, type: EurojackpotDrawType): Date {
  const dayOfWeek = referenceDate.getDay() // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
  const DRAW_DAYS: readonly number[] = [2, 5] // Tuesday (2) and Friday (5)

  let daysToAddOrSubtract: number

  if (type === EurojackpotDrawType.PREVIOUS) {
    // Calculate days *back* to the nearest previous draw day (Tue or Fri)
    // Example: If today is Sunday (0), previous draw was Friday (-2 days).
    // Example: If today is Wednesday (3), previous draw was Tuesday (-1 day).
    // Example: If today is Tuesday (2), previous draw was *last* Friday (-4 days).
    let daysAgo = Infinity
    for (const drawDay of DRAW_DAYS) {
      let diff = (dayOfWeek - drawDay + 7) % 7 // Days since the last occurrence of drawDay
      if (diff === 0) diff = 7 // If today is a draw day, we want the *previous* one (7 days ago)
      daysAgo = Math.min(daysAgo, diff)
    }
    daysToAddOrSubtract = -daysAgo
  } else {
    // EurojackpotDrawType.NEXT
    // Calculate days *forward* to the nearest upcoming draw day (Tue or Fri)
    // Example: If today is Sunday (0), next draw is Tuesday (+2 days).
    // Example: If today is Wednesday (3), next draw is Friday (+2 days).
    // Example: If today is Tuesday (2), next draw is Friday (+3 days).
    // Example: If today is Friday (5), next draw is *next* Tuesday (+4 days).
    let daysForward = Infinity
    for (const drawDay of DRAW_DAYS) {
      let diff = (drawDay - dayOfWeek + 7) % 7 // Days until the next occurrence of drawDay
      if (diff === 0) {
        // If today is a draw day, find the *next* one
        // If today is Tuesday, next is Fri (+3). If today is Friday, next is Tue (+4).
        diff = drawDay === 2 ? 3 : 4
      }
      daysForward = Math.min(daysForward, diff)
    }
    daysToAddOrSubtract = daysForward
  }

  const drawDate = new Date(referenceDate)
  drawDate.setDate(referenceDate.getDate() + daysToAddOrSubtract)
  // Ensure time is reset to avoid timezone issues (optional, depends on API)
  drawDate.setHours(0, 0, 0, 0)
  return drawDate
}

/**
 * Generates the URL to fetch historic EuroJackpot odds data from the Lotto Bayern API
 * based on the desired draw type (previous or next relative to today).
 *
 * The API requires a key in the format 'YYYY-WW-D', where YYYY is the year,
 * WW is the ISO week number, and D is the day of the week (2 for Tuesday, 5 for Friday).
 *
 * @param type Whether to get the URL for the 'previous' or 'next' draw.
 * @returns The fully constructed URL string.
 */
export function generateEurojackpotUrl(type: EurojackpotDrawType): string {
  const BASE_URL =
    'https://www.lotto-bayern.de/getEurojackpotHistoricOdds?gckey='
  const today = new Date()

  // Find the actual date of the draw we are interested in.
  const drawDate = getDrawDate(today, type)

  const year = drawDate.getFullYear()
  const weekNumber = getISOWeekNumber(drawDate)
  const drawDayOfWeek = drawDate.getDay() // This will be 2 (Tue) or 5 (Fri)

  // Format week number with leading zero if needed (e.g., 09 instead of 9)
  const formattedWeekNumber =
    weekNumber < 10 ? `0${weekNumber}` : `${weekNumber}`

  // Construct the key required by the API.
  const gckey = `${year}-${formattedWeekNumber}-${drawDayOfWeek}` // Format YYYY-WW-D

  console.log(
    `Generated gckey for ${type} draw on ${drawDate.toDateString()}: ${gckey}`
  )

  return `${BASE_URL}${gckey}`
}
