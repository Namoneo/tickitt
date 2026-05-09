import { signal, computed } from '@angular/core';
import { subscribeRunEvents, type RunEventPayload } from './run-events.bridge.js';

interface EventEntry {
  id: number;
  payload: unknown;
}

interface RunState {
  state: string;
  error: string | null;
}

interface StreamData {
  events: EventEntry[];
  state: RunState | null;
}

export class RunStreamService {
  private readonly streams = new Map<string, {
    events: ReturnType<typeof signal<EventEntry[]>>;
    state: ReturnType<typeof signal<RunState | null>>;
  }>();

  private readonly queueSig = signal<{ active: number; waiting: number }>({ active: 0, waiting: 0 });
  private readonly statsSig = signal<{ active: number; queued: number; awaiting: number; failed: number }>({ active: 0, queued: 0, awaiting: 0, failed: 0 });

  readonly queueStats = this.queueSig.asReadonly();
  readonly runStats = this.statsSig.asReadonly();

  constructor() {
    subscribeRunEvents((payload) => this.handle(payload));
  }

  forRun(runId: string) {
    const s = this.ensure(runId);
    return {
      events: computed(() => s.events()),
      state: computed(() => s.state()),
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
