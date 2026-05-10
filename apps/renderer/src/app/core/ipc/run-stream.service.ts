import { Injectable, signal, computed, inject, afterNextRender, DestroyRef } from '@angular/core';
import { subscribeRunEvents, type RunEventPayload } from './run-events.bridge.js';

interface EventEntry {
  id: number;
  payload: unknown;
}

interface RunState {
  state: string;
  error: string | null;
}

@Injectable()
export class RunStreamService {
  private readonly streams = new Map<string, {
    events: ReturnType<typeof signal<EventEntry[]>>;
    state: ReturnType<typeof signal<RunState | null>>;
    capabilities: ReturnType<typeof signal<{ supportsContinuation: boolean } | null>>;
  }>();

  private readonly queueSig = signal<{ active: number; waiting: number }>({ active: 0, waiting: 0 });
  private readonly statsSig = signal<{ active: number; queued: number; awaiting: number; failed: number }>({ active: 0, queued: 0, awaiting: 0, failed: 0 });

  readonly queueStats = this.queueSig.asReadonly();
  readonly runStats = this.statsSig.asReadonly();

  constructor() {
    const dr = inject(DestroyRef);
    const attach = (): boolean => {
      const unsub = subscribeRunEvents((payload) => this.handle(payload));
      if (unsub) {
        dr.onDestroy(() => unsub());
        return true;
      }
      return false;
    };
    if (!attach()) {
      afterNextRender(() => {
        if (!attach()) {
          // Browser tab: no warn (shell banner already explains). Electron without runEvents: preload bug.
          const w = typeof window !== 'undefined' ? (window as Window & { electronTRPC?: unknown }) : undefined;
          if (w?.electronTRPC) {
            console.warn('Tickitt: window.runEvents missing in Electron — check apps/main/src/preload.ts');
          }
        }
      });
    }
  }

  forRun(runId: string) {
    const s = this.ensure(runId);
    return {
      events: computed(() => s.events()),
      state: computed(() => s.state()),
      agentCapabilities: computed(() => s.capabilities()),
    };
  }

  seed(runId: string, events: Array<{ id: number; payloadJson: unknown }>) {
    const s = this.ensure(runId);
    s.events.set(events.map((e) => ({ id: e.id, payload: e.payloadJson })));
  }

  private ensure(runId: string) {
    let s = this.streams.get(runId);
    if (!s) {
      s = {
        events: signal<EventEntry[]>([]),
        state: signal<RunState | null>(null),
        capabilities: signal<{ supportsContinuation: boolean } | null>(null),
      };
      this.streams.set(runId, s);
    }
    return s;
  }

  private handle(payload: RunEventPayload): void {
    if (payload.kind === 'event') {
      const s = this.ensure(payload.runId);
      const ev = payload.event;
      const dbId = payload.eventDbId;
      if (ev && dbId != null) {
        s.events.update((arr) =>
          arr.some((e) => e.id === dbId)
            ? arr
            : [...arr, { id: dbId, payload: ev }]
        );
      }
    } else if (payload.kind === 'state') {
      const s = this.ensure(payload.runId);
      s.state.set({ state: payload.state ?? 'unknown', error: payload.error ?? null });
    } else if (payload.kind === 'agent.capabilities') {
      const s = this.ensure(payload.runId);
      if (payload.agentCapabilities) {
        s.capabilities.set({ supportsContinuation: payload.agentCapabilities.supportsContinuation });
      }
    } else if (payload.kind === 'queue') {
      this.queueSig.set({ active: payload.active ?? 0, waiting: payload.waiting ?? 0 });
    } else if (payload.kind === 'stats') {
      this.statsSig.set({
        active: payload.active ?? 0,
        queued: payload.queued ?? 0,
        awaiting: payload.awaiting ?? 0,
        failed: payload.failed ?? 0,
      });
    }
  }
}
