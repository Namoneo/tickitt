/**
 * Renderer-side bridge for the `runs:event` IPC channel.
 * This bypasses tRPC — events are pushed from main as they happen.
 */
export interface RunEventPayload {
  kind: 'event' | 'state' | 'queue' | 'stats';
  runId: string;
  event?: { type: string; payload: unknown };
  eventDbId?: number;
  state?: string;
  error?: string | null;
  active?: number;
  waiting?: number;
  queued?: number;
  awaiting?: number;
  failed?: number;
}

interface RunEventsGlobal {
  onEvent: (cb: (payload: RunEventPayload) => void) => () => void;
}

declare global {
  interface Window {
    runEvents?: RunEventsGlobal;
  }
}

/**
 * Subscribe to main-process run events. Returns null when not running inside
 * Electron with preload (e.g. plain browser on the dev server URL).
 */
export function subscribeRunEvents(cb: (payload: RunEventPayload) => void): (() => void) | null {
  if (typeof window === 'undefined' || !window.runEvents) {
    return null;
  }
  return window.runEvents.onEvent(cb);
}
