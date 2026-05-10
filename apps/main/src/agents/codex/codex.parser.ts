import type { AgentEvent } from '../agent.types.js';
import type { CodexStreamEvent } from './codex.types.js';

/**
 * Translate one Codex JSONL event into zero or more AgentEvents.
 *
 * Codex's event schema is evolving. This parser is defensive:
 * - Known types are translated precisely.
 * - Unknown types emit a `system` event so nothing is silently dropped.
 * - Missing fields are defaulted (e.g. empty content → no event).
 */
export function translateCodexEvent(raw: CodexStreamEvent): AgentEvent[] {
  switch (raw.type) {
    case 'thread.started': {
      const ev = raw as Extract<CodexStreamEvent, { type: 'thread.started' }>;
      return [{ type: 'system', subtype: 'init', data: { session_id: ev.thread_id } }];
    }

    case 'thread.finished':
      return [{ type: 'system', subtype: 'thread.finished', data: raw }];

    case 'turn.started':
      return [{ type: 'system', subtype: 'turn.started', data: raw }];

    case 'turn.finished':
      return [{ type: 'system', subtype: 'turn.finished', data: raw }];

    case 'turn.failed': {
      const ev = raw as Extract<CodexStreamEvent, { type: 'turn.failed' }>;
      const msg = ev.error?.message ?? 'Turn failed';
      return [{ type: 'error', message: msg }];
    }

    case 'message': {
      const ev = raw as Extract<CodexStreamEvent, { type: 'message' }>;
      if (ev.role !== 'assistant') return [];

      const out: AgentEvent[] = [];
      const content = ev.content;

      if (typeof content === 'string' && content.length > 0) {
        out.push({ type: 'text', content });
        return out;
      }

      if (Array.isArray(content)) {
        for (const block of content) {
          if (!block || typeof block !== 'object') continue;
          if (block.type === 'text' && typeof block.text === 'string' && block.text.length > 0) {
            out.push({ type: 'text', content: block.text });
          } else if (block.type === 'tool_use' && typeof block.name === 'string') {
            out.push({ type: 'tool_use', tool: block.name, input: block.input });
          } else if (block.type === 'tool_result' && typeof block.name === 'string') {
            out.push({
              type: 'tool_result',
              tool: block.name,
              output: block.output,
              isError: block.isError === true,
            });
          }
        }
      }
      return out;
    }

    case 'usage': {
      const ev = raw as Extract<CodexStreamEvent, { type: 'usage' }>;
      return [{
        type: 'usage',
        inputTokens: ev.inputTokens ?? 0,
        outputTokens: ev.outputTokens ?? 0,
        costUsd: ev.costUsd,
      }];
    }

    case 'error': {
      const ev = raw as Extract<CodexStreamEvent, { type: 'error' }>;
      return [{ type: 'error', message: ev.message ?? 'Codex error' }];
    }

    default:
      return [{ type: 'system', subtype: `unknown:${raw.type}`, data: raw }];
  }
}
