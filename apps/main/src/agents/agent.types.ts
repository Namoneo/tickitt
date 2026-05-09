export type AgentKind = 'claude-code' | 'codex' | 'gemini' | 'opencode' | 'cursor';

export interface AgentCapabilities {
  /** Whether the agent commits its own changes (vs. leaving the working tree dirty). Informational. */
  commitsOwnChanges: boolean;
  /** Whether the agent supports a continuation prompt against the same session. P4 will use this. */
  supportsContinuation: boolean;
  /** Whether stdout is structured (e.g. NDJSON). If false, we treat output as raw text. */
  hasStructuredOutput: boolean;
}

export type AgentEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_use'; tool: string; input: unknown; toolUseId?: string }
  | { type: 'tool_result'; tool: string; output: unknown; toolUseId?: string; isError?: boolean }
  | { type: 'error'; message: string }
  | { type: 'usage'; inputTokens: number; outputTokens: number; costUsd?: number; durationMs?: number }
  | { type: 'system'; subtype: string; data?: unknown };

export interface SpawnOptions {
  cwd: string;
  prompt: string;
  env?: Record<string, string>;
  binaryPath: string;
  extraArgs: string[];
  /** When set, the agent should resume the prior session rather than start fresh. */
  resumeSessionId?: string | undefined;
}

export interface RunHandle {
  pid: number;
  events: AsyncIterable<AgentEvent>;
  exitCode: Promise<number | null>;
  cancel(): Promise<void>;
  /** Resolves with the agent's session id (for resume), or null if it was never reported. */
  sessionId: Promise<string | null>;
}
