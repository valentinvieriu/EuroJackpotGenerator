import { generateTickets } from '~/utils/ticketGenerator'
import type { H3Event } from 'h3'
import { H3Error, createError, readBody, defineEventHandler } from 'h3'
import type { Ticket } from '~/types/ticket'

// Define reasonable limits for generation requests
const MIN_TICKETS = 1
const MAX_TICKETS = 500 // Adjusted limit for performance/abuse prevention
const MIN_MAIN_COUNT = 5 // Minimum standard main numbers
const MAX_MAIN_COUNT = 16 // Practical limit for system tickets (adjust as needed)
const MIN_EURO_COUNT = 2 // Minimum standard euro numbers
const MAX_EURO_COUNT = 12 // Maximum possible euro numbers

/**
 * API endpoint handler for generating EuroJackpot tickets.
 * Accepts POST requests with ticket generation parameters in the body.
 * Performs validation on input parameters before calling the generation utility.
 *
 * @param event The H3 event object, containing the request details.
 * @returns A promise resolving to an array of generated Ticket objects.
 * @throws {H3Error} Throws HTTP errors for invalid input (400) or internal errors (500).
 */
export default defineEventHandler(async (event: H3Event): Promise<Ticket[]> => {
  try {
    // 1. Read and parse the request body
    const body = await readBody(event)

    // Ensure body is an object
    if (typeof body !== 'object' || body === null) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body. Expected JSON object.',
      })
    }

    // 2. Extract and validate parameters
    const ticketCountInput = body.ticketCount
    const mainCountInput = body.mainCount
    const euroCountInput = body.euroCount

    const ticketCount = Number.parseInt(String(ticketCountInput), 10)
    const mainCount = Number.parseInt(String(mainCountInput), 10)
    const euroCount = Number.parseInt(String(euroCountInput), 10)

    // Validate ticketCount
    if (
      Number.isNaN(ticketCount) ||
      ticketCount < MIN_TICKETS ||
      ticketCount > MAX_TICKETS
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: `Number of tickets must be an integer between ${MIN_TICKETS} and ${MAX_TICKETS}.`,
      })
    }

    // Validate mainCount
    if (
      Number.isNaN(mainCount) ||
      mainCount < MIN_MAIN_COUNT ||
      mainCount > MAX_MAIN_COUNT
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: `Main number count must be an integer between ${MIN_MAIN_COUNT} and ${MAX_MAIN_COUNT}.`,
      })
    }

    // Validate euroCount
    if (
      Number.isNaN(euroCount) ||
      euroCount < MIN_EURO_COUNT ||
      euroCount > MAX_EURO_COUNT
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: `Euro number count must be an integer between ${MIN_EURO_COUNT} and ${MAX_EURO_COUNT}.`,
      })
    }

    // Optional: Add validation for system ticket combinations (e.g., mainCount >= 5, euroCount >= 2)
    if (mainCount < 5 || euroCount < 2) {
      // This check might be redundant given MIN checks above, but good for clarity
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid system combination: Main count must be at least 5, Euro count must be at least 2.`,
      })
    }

    // 3. Call the ticket generation utility
    console.log(
      `Generating ${ticketCount} tickets with system ${mainCount}/${euroCount}...`
    )
    const tickets = await generateTickets(ticketCount, mainCount, euroCount)
    console.log(`Successfully generated ${tickets.length} tickets.`)

    // 4. Return the generated tickets
    return tickets
  } catch (error: unknown) {
    // Log the detailed error on the server-side
    console.error('Error in /api/generate endpoint:', error)

    // If it's already an H3Error (like validation errors), re-throw it
    if (error instanceof H3Error) {
      throw error
    }

    // For other unexpected errors (e.g., from generateTickets), return a generic 500 error
    // Include the original error message in the data payload for client-side debugging if desired,
    // but be cautious about exposing sensitive details.
    throw createError({
      statusCode: 500,
      statusMessage:
        'An internal server error occurred while generating tickets.',
      // data: { message: error instanceof Error ? error.message : String(error) } // Optional: include error details
    })
  }
})
