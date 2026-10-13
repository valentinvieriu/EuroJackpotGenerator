// Module Worker for the autoplay (Monte Carlo) engine
// Plays one whole run per worker; the page stops a run by terminating it

import {
  runSimulation,
  type SimulationWorkerMessage,
} from '@/utils/simulationEngine'
import type { BatchSimulationRequest } from '@/schemas'

const post = (message: SimulationWorkerMessage) => self.postMessage(message)

self.onmessage = (event: MessageEvent<BatchSimulationRequest>) => {
  try {
    const outcome = runSimulation(event.data, (snapshot) =>
      post({ type: 'progress', snapshot })
    )
    post({ type: 'result', ...outcome })
  } catch (error) {
    post({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
