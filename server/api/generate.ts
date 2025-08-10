import { generateTickets } from '~/utils/ticketGenerator'
import { combinationCount } from '~/utils/combinatorics'
import type { H3Event } from 'h3'
import { readBody, defineEventHandler } from 'h3'
import {
  generateRequestSchema,
  generateResponseSchema,
  type GenerateResponse,
} from '~/schemas'
import {
  validateInput,
  validateOutput,
  handleEndpointError,
} from '../utils/validation'

/**
 * API endpoint handler for generating EuroJackpot tickets.
 * Validates input/output at the edges and handles all error cases properly.
 */
export default defineEventHandler(
  async (event: H3Event): Promise<GenerateResponse> => {
    try {
      // 1. Validate input at the edge
      const rawBody = await readBody(event)
      const { ticketCount, mainCount, euroCount } = validateInput(
        generateRequestSchema,
        rawBody,
        'ticket generation request'
      )

      // 2. Execute business logic
      console.log(
        `Generating ${ticketCount} tickets with system ${mainCount}/${euroCount}...`
      )
      const tickets = await generateTickets(ticketCount, mainCount, euroCount)

      // 3. Set linesCount for each ticket
      for (const ticket of tickets) {
        ticket.linesCount = combinationCount(
          ticket.mainNumbers.length,
          ticket.euroNumbers.length
        )
      }

      console.log(`Successfully generated ${tickets.length} tickets.`)

      // 4. Validate output at the edge
      return validateOutput(
        generateResponseSchema,
        tickets,
        'ticket generation response'
      )
    } catch (error: unknown) {
      handleEndpointError(error, '/api/generate')
    }
  }
)
