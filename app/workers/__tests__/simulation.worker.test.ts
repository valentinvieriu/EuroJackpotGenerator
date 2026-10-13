import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runSimulation } from '~/utils/simulationEngine'
import type { SimulationWorkerMessage } from '~/utils/simulationEngine'
import type { BatchSimulationRequest } from '~/schemas'

const request: BatchSimulationRequest = {
  tickets: [{ id: 1, mainNumbers: [1, 2, 3, 4, 5], euroNumbers: [1, 2] }],
  simulationCount: 500,
  seed: 'worker-test',
  payouts: { 11: 10.2, 12: 8.4 },
  recordDraws: false,
}

/** Load the worker module against a stand-in for the worker global */
const loadWorker = async () => {
  const posted: SimulationWorkerMessage[] = []
  const scope = {
    onmessage: null as ((event: { data: unknown }) => void) | null,
    postMessage: (message: SimulationWorkerMessage) => posted.push(message),
  }
  vi.stubGlobal('self', scope)
  await import('../simulation.worker')
  return { posted, send: (data: unknown) => scope.onmessage!({ data }) }
}

describe('simulation worker', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('plays the requested run and posts the outcome', async () => {
    const worker = await loadWorker()
    worker.send(request)

    const expected = runSimulation(request, () => {})
    expect(worker.posted.at(-1)).toEqual({ type: 'result', ...expected })
    expect(() => structuredClone(worker.posted)).not.toThrow()
  })

  it('posts an error instead of dying on a request it cannot play', async () => {
    const worker = await loadWorker()
    worker.send(null)

    expect(worker.posted).toHaveLength(1)
    expect(worker.posted[0]).toMatchObject({ type: 'error' })
  })
})
