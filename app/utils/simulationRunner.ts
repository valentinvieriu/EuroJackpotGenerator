/**
 * Page-side handle on the simulation worker: starts one worker per run and
 * turns its messages into a promise plus progress callbacks.
 */

import type { BatchSimulationRequest } from '~/schemas'
import type {
  SimulationOutcome,
  SimulationSnapshot,
  SimulationWorkerMessage,
} from '~/utils/simulationEngine'

export interface SimulationRun {
  /** Settles with the outcome, or with null when the run was cancelled */
  finished: Promise<SimulationOutcome | null>
  /** Stops the run at once, wherever it is */
  cancel: () => void
}

function createSimulationWorker(): Worker {
  // Path is relative to this file (utils -> workers)
  return new Worker(
    new URL('../workers/simulation.worker.ts', import.meta.url),
    {
      type: 'module',
      name: 'simulation-worker',
    }
  )
}

/**
 * Start a run in its own worker. The request must be plain data: it is
 * copied across to the worker, and reactive proxies cannot be.
 */
export function startSimulationRun(
  request: BatchSimulationRequest,
  onProgress: (snapshot: SimulationSnapshot) => void
): SimulationRun {
  const worker = createSimulationWorker()
  let cancel = () => {}

  const finished = new Promise<SimulationOutcome | null>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<SimulationWorkerMessage>) => {
      const message = event.data
      if (message.type === 'progress') {
        onProgress(message.snapshot)
        return
      }
      worker.terminate()
      if (message.type === 'result') {
        resolve({ result: message.result, trajectory: message.trajectory })
      } else {
        reject(new Error(message.error))
      }
    }
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || 'The simulation stopped unexpectedly.'))
    }
    cancel = () => {
      worker.terminate()
      resolve(null)
    }
  })

  worker.postMessage(request)
  return { finished, cancel }
}
