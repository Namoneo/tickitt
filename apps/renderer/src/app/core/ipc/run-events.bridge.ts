/**
 * Renderer-side bridge for the `runs:event` IPC channel.
 * This bypasses tRPC — events are pushed from main as they happen.
 */
export interface RunEventPayload {
  kind: 'event' | 'state' | 'queue';
  runId: string;
  event?: { type: string; payload: unknown };
  eventDbId?: number;
  state?: string;
  error?: string | null;
  active?: number;
  waiting?: number;
}

interface RunEventsGlobal {
  onEvent: (cb: (payload: RunEventPayload) => void) => () => void;
}

declare global {
  interface Window {
    runEvents?: RunEventsGlobal;
  }
}

export function subscribeRunEvents(cb: (payload: RunEventPayload) => void): () => void {
  if (!window.runEvents) {
    throw new Error('window.runEvents not exposed — check preload script');
  }
  return window.runEvents.onEvent(cb);
}
