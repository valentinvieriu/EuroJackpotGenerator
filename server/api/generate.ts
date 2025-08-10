import { generateTickets } from '~/utils/ticketGenerator'
import { combinationCount } from '~/utils/combinatorics'
import type { H3Event } from 'h3'
import { H3Error, createError, readBody, defineEventHandler } from 'h3'
import { generateRequestSchema, type Ticket } from '~/schemas'

// Validation now handled by Zod schema

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
    // 1. Parse and validate request body with Zod
    const rawBody = await readBody(event)
    const parseResult = generateRequestSchema.safeParse(rawBody)

    if (!parseResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body',
        data: {
          errors: parseResult.error.errors,
        },
      })
    }

    const { ticketCount, mainCount, euroCount } = parseResult.data

    // 3. Call the ticket generation utility
    console.log(
      `Generating ${ticketCount} tickets with system ${mainCount}/${euroCount}...`
    )
    const tickets = await generateTickets(ticketCount, mainCount, euroCount)

    // 4. Set linesCount for each ticket
    for (const ticket of tickets) {
      ticket.linesCount = combinationCount(
        ticket.mainNumbers.length,
        ticket.euroNumbers.length
      )
    }

    console.log(`Successfully generated ${tickets.length} tickets.`)

    // 5. Return the generated tickets
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
