/**
 * Codex CLI stream events (JSONL via `codex exec --json`).
 *
 * Shapes discovered empirically from `codex exec --json` output.
 * Codex's event schema is evolving; keep this as the source of truth.
 */

/** Thread / session lifecycle events */
export interface CodexThreadStarted {
  type: 'thread.started';
  thread_id: string;
}

export interface CodexThreadFinished {
  type: 'thread.finished';
  thread_id: string;
}

/** Turn (one prompt → response cycle) lifecycle events */
export interface CodexTurnStarted {
  type: 'turn.started';
}

export interface CodexTurnFinished {
  type: 'turn.finished';
}

export interface CodexTurnFailed {
  type: 'turn.failed';
  error: { message: string };
}

/** Content / thinking events */
export interface CodexMessage {
  type: 'message';
  role: 'assistant' | 'user';
  content: string | Array<
    | { type: 'text'; text: string }
    | { type: 'tool_use'; name: string; input?: unknown }
    | { type: 'tool_result'; name: string; output?: unknown; isError?: boolean }
  >;
}

/** Usage / billing events */
export interface CodexUsage {
  type: 'usage';
  inputTokens: number;
  outputTokens: number;
  costUsd?: number;
}

/** Error events */
export interface CodexError {
  type: 'error';
  message: string;
}

/** Fallback for any unknown event Codex might emit */
export interface CodexUnknown {
  type: string;
  [k: string]: unknown;
}

export type CodexStreamEvent =
  | CodexThreadStarted
  | CodexThreadFinished
  | CodexTurnStarted
  | CodexTurnFinished
  | CodexTurnFailed
  | CodexMessage
  | CodexUsage
  | CodexError
  | CodexUnknown;
