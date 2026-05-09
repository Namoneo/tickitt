import { ClaudeCodeAdapter } from './claude-code/claude-code.adapter.js';
import type { AgentAdapter } from './agent.adapter.js';
import type { AgentKind } from './agent.types.js';

export class AgentRegistry {
  private readonly factories = new Map<AgentKind, () => AgentAdapter>();

  constructor() {
    this.register('claude-code', () => new ClaudeCodeAdapter());
    // Other adapters registered in P7+.
  }

  register(kind: AgentKind, factory: () => AgentAdapter): void {
    this.factories.set(kind, factory);
  }

  get(kind: AgentKind): AgentAdapter {
    const factory = this.factories.get(kind);
    if (!factory) throw new Error(`No adapter registered for agent kind: ${kind}`);
    return factory();
  }
}
