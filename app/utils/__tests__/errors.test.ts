import { describe, it, expect } from 'vitest'
import { extractErrorMessage, createErrorMessage } from '../errors'

describe('errors', () => {
  describe('extractErrorMessage', () => {
    it('handles string errors', () => {
      const result = extractErrorMessage('Simple error message')
      expect(result).toBe('Simple error message')
    })

    it('handles Error instances', () => {
      const error = new Error('Something went wrong')
      const result = extractErrorMessage(error)
      expect(result).toBe('Something went wrong')
    })

    it('handles API error objects with nested data.message', () => {
      const apiError = {
        data: {
          message: 'API returned an error',
        },
        statusCode: 400,
      }
      const result = extractErrorMessage(apiError)
      expect(result).toBe('API returned an error')
    })

    it('handles objects with direct message property', () => {
      const error = {
        message: 'Direct message error',
        type: 'validation',
      }
      const result = extractErrorMessage(error)
      expect(result).toBe('Direct message error')
    })

    it('handles H3 error objects with statusMessage', () => {
      const h3Error = {
        statusMessage: 'Bad Request',
        statusCode: 400,
        data: {},
      }
      const result = extractErrorMessage(h3Error)
      expect(result).toBe('Bad Request')
    })

    it('prioritizes nested data.message over direct message', () => {
      const error = {
        message: 'Generic message',
        data: {
          message: 'Specific API message',
        },
      }
      const result = extractErrorMessage(error)
      expect(result).toBe('Specific API message')
    })

    it('handles null and undefined', () => {
      expect(extractErrorMessage(null)).toBe('An unexpected error occurred')
      expect(extractErrorMessage(undefined)).toBe(
        'An unexpected error occurred'
      )
    })

    it('handles empty objects', () => {
      const result = extractErrorMessage({})
      expect(result).toBe('An unexpected error occurred')
    })

    it('handles objects with non-string message properties', () => {
      const error = {
        message: 123,
        data: {
          message: true,
        },
      }
      const result = extractErrorMessage(error)
      expect(result).toBe('An unexpected error occurred')
    })

    it('handles complex nested structures', () => {
      const complexError = {
        response: {
          data: {
            error: {
              message: 'Deep nested error',
            },
          },
        },
        message: 'Outer message',
      }
      const result = extractErrorMessage(complexError)
      expect(result).toBe('Outer message') // Should use direct message
    })
  })

  describe('createErrorMessage', () => {
    it('returns message without context', () => {
      const result = createErrorMessage('Something failed')
      expect(result).toBe('Something failed')
    })

    it('returns message with context', () => {
      const result = createErrorMessage('Connection timeout', 'Database')
      expect(result).toBe('Database: Connection timeout')
    })

    it('handles empty context', () => {
      const result = createErrorMessage('Error occurred', '')
      expect(result).toBe('Error occurred')
    })

    it('handles undefined context', () => {
      const result = createErrorMessage('Error occurred', undefined)
      expect(result).toBe('Error occurred')
    })
  })
})
