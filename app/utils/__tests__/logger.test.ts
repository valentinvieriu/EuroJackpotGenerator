import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import { logger } from '~/utils/logger'

const originalEnv = { ...process.env }

describe('logger (server-side)', () => {
  let debugSpy: ReturnType<typeof vi.spyOn>
  let infoSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  it('suppresses debug in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.LOG_LEVEL = 'debug'
    logger.debug('dbg')
    logger.info('info')
    logger.warn('warn')
    logger.error('err')

    expect(debugSpy).not.toHaveBeenCalled()
    expect(infoSpy).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()
  })

  it('respects LOG_LEVEL filtering', () => {
    process.env.NODE_ENV = 'development'
    process.env.LOG_LEVEL = 'error'
    logger.debug('dbg')
    logger.info('info')
    logger.warn('warn')
    logger.error('err')

    expect(debugSpy).not.toHaveBeenCalled()
    expect(infoSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()
  })

  it('logs debug in dev when level=debug', () => {
    process.env.NODE_ENV = 'development'
    process.env.LOG_LEVEL = 'debug'
    logger.debug('dbg')
    expect(debugSpy).toHaveBeenCalled()
  })
})
