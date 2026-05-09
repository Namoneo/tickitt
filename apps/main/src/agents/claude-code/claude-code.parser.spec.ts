import { describe, it, expect } from 'vitest';
import { translateClaudeEvent } from './claude-code.parser.js';
import type { CCStreamEvent } from './claude-code.types.js';

describe('translateClaudeEvent', () => {
  it('maps system init to system event', () => {
    const raw: CCStreamEvent = { type: 'system', subtype: 'init', session_id: 's1', cwd: '/tmp', tools: ['read'], model: 'claude-3-5-sonnet' } as any;
    const out = translateClaudeEvent(raw);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: 'system', subtype: 'init' });
  });

  it('maps assistant text block to text event', () => {
    const raw: CCStreamEvent = {
      type: 'assistant',
      message: { id: 'm1', content: [{ type: 'text', text: 'hello world' }] },
    } as any;
    const out = translateClaudeEvent(raw);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ type: 'text', content: 'hello world' });
  });

  it('maps assistant tool_use block to tool_use event', () => {
    const raw: CCStreamEvent = {
      type: 'assistant',
      message: { id: 'm1', content: [{ type: 'tool_use', id: 't1', name: 'bash', input: { command: 'ls' } }] },
    } as any;
    const out = translateClaudeEvent(raw);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: 'tool_use', tool: 'bash', toolUseId: 't1' });
  });

  it('maps user tool_result block to tool_result event', () => {
    const raw: CCStreamEvent = {
      type: 'user',
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok', is_error: true }] },
    } as any;
    const out = translateClaudeEvent(raw);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: 'tool_result', toolUseId: 't1', isError: true });
  });

  it('maps result success to usage event', () => {
    const raw: CCStreamEvent = { type: 'result', subtype: 'success', is_error: false, duration_ms: 1234, usage: { input_tokens: 10, output_tokens: 20 }, total_cost_usd: 0.001 } as any;
    const out = translateClaudeEvent(raw);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: 'usage', inputTokens: 10, outputTokens: 20, costUsd: 0.001 });
  });

  it('maps result error to error + usage events', () => {
    const raw: CCStreamEvent = { type: 'result', subtype: 'error', is_error: true, result: 'something broke', duration_ms: 500 } as any;
    const out = translateClaudeEvent(raw);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ type: 'error', message: 'something broke' });
    expect(out[1]).toMatchObject({ type: 'usage' });
  });

  it('falls back to system:unknown for unrecognised event types', () => {
    const raw: CCStreamEvent = { type: 'future_event', data: 42 } as any;
    const out = translateClaudeEvent(raw);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ type: 'system', subtype: 'unknown:future_event' });
  });
});
