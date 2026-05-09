import type { AgentEvent } from '../agent.types.js';
import type { CCStreamEvent } from './claude-code.types.js';

/**
 * Translate one Claude Code stream-json event into zero or more AgentEvents.
 * Robust to unknown event types — emits a `system` event for anything we don't recognise.
 */
export function translateClaudeEvent(raw: CCStreamEvent): AgentEvent[] {
  switch (raw.type) {
    case 'system': {
      return [{
        type: 'system',
        subtype: (raw as any).subtype ?? 'system',
        data: raw,
      }];
    }
    case 'assistant': {
      const msg = (raw as any).message;
      const out: AgentEvent[] = [];
      for (const block of msg?.content ?? []) {
        if (block.type === 'text') {
          if (block.text) out.push({ type: 'text', content: block.text });
        } else if (block.type === 'tool_use') {
          out.push({
            type: 'tool_use',
            tool: block.name,
            input: block.input,
            toolUseId: block.id,
          });
        }
      }
      return out;
    }
    case 'user': {
      const msg = (raw as any).message;
      const out: AgentEvent[] = [];
      for (const block of msg?.content ?? []) {
        if (block.type === 'tool_result') {
          out.push({
            type: 'tool_result',
            tool: '(unknown)',
            output: block.content,
            toolUseId: block.tool_use_id,
            isError: block.is_error === true,
          });
        }
      }
      return out;
    }
    case 'result': {
      const r = raw as any;
      const events: AgentEvent[] = [];
      if (r.is_error) {
        events.push({
          type: 'error',
          message: typeof r.result === 'string' ? r.result : (r.subtype ?? 'agent error'),
        });
      }
      events.push({
        type: 'usage',
        inputTokens: r.usage?.input_tokens ?? 0,
        outputTokens: r.usage?.output_tokens ?? 0,
        costUsd: r.total_cost_usd,
        durationMs: r.duration_ms,
      });
      return events;
    }
    default:
      return [{ type: 'system', subtype: `unknown:${raw.type}`, data: raw }];
  }
}
