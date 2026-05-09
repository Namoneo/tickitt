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

  constructor() {
    subscribeRunEvents((payload) => this.handle(payload));
  }

  queueStats() {
    return computed(() => this.queueSig());
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
      if (ev && payload.eventDbId != null) {
        s.events.update((arr) =>
          arr.some((e) => e.id === payload.eventDbId)
            ? arr
            : [...arr, { id: payload.eventDbId, payload: ev }]
        );
      }
    } else if (payload.kind === 'state') {
      const s = this.ensure(payload.runId);
      s.state.set({ state: payload.state ?? 'unknown', error: payload.error ?? null });
    } else if (payload.kind === 'queue') {
      this.queueSig.set({ active: payload.active ?? 0, waiting: payload.waiting ?? 0 });
    }
  }
}
