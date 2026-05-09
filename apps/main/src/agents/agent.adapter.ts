import type { AgentCapabilities, AgentKind, RunHandle, SpawnOptions } from './agent.types.js';

export interface AgentAdapter {
  readonly kind: AgentKind;
  readonly capabilities: AgentCapabilities;
  spawn(opts: SpawnOptions): RunHandle;
}
