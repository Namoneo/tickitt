import { spawn } from 'node:child_process';
import ndjson from 'ndjson';
import type { AgentAdapter } from '../agent.adapter.js';
import type { AgentCapabilities, AgentEvent, RunHandle, SpawnOptions } from '../agent.types.js';
import type { CCStreamEvent } from './claude-code.types.js';
import { translateClaudeEvent } from './claude-code.parser.js';

const DEFAULT_ARGS = [
  '--print',
  '--output-format', 'stream-json',
  '--input-format', 'text',
  '--verbose',
  '--dangerously-skip-permissions',
];

export class ClaudeCodeAdapter implements AgentAdapter {
  readonly kind = 'claude-code' as const;
  readonly capabilities: AgentCapabilities = {
    commitsOwnChanges: false,
    supportsContinuation: true,
    hasStructuredOutput: true,
  };

  spawn(opts: SpawnOptions): RunHandle {
    const args = [...DEFAULT_ARGS, ...opts.extraArgs];
    const child = spawn(opts.binaryPath, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env, FORCE_COLOR: '0' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Write the prompt to stdin and close.
    child.stdin!.write(opts.prompt);
    child.stdin!.end();

    const queue: AgentEvent[] = [];
    let waiter: (() => void) | null = null;
    let closed = false;
    let exitCode: number | null = null;

    const emit = (e: AgentEvent): void => {
      queue.push(e);
      if (waiter) { const w = waiter; waiter = null; w(); }
    };

    const stdoutParser = child.stdout!.pipe(ndjson.parse({ strict: false }));
    stdoutParser.on('data', (raw: CCStreamEvent) => {
      try {
        for (const ev of translateClaudeEvent(raw)) emit(ev);
      } catch (err) {
        emit({ type: 'error', message: `Parse error: ${(err as Error).message}` });
      }
    });
    stdoutParser.on('error', (err: Error) => {
      emit({ type: 'error', message: `Stdout parse stream error: ${err.message}` });
    });

    let stderrBuf = '';
    child.stderr!.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString('utf8');
      const lines = stderrBuf.split('\n');
      stderrBuf = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim()) emit({ type: 'system', subtype: 'stderr', data: line });
      }
    });

    const exit = new Promise<number | null>((resolve) => {
      child.on('close', (code) => {
        exitCode = code;
        if (stderrBuf.trim()) emit({ type: 'system', subtype: 'stderr', data: stderrBuf.trim() });
        closed = true;
        if (waiter) { const w = waiter; waiter = null; w(); }
        resolve(code);
      });
      child.on('error', (err) => {
        emit({ type: 'error', message: err.message });
      });
    });

    const events: AsyncIterable<AgentEvent> = {
      async *[Symbol.asyncIterator]() {
        while (true) {
          if (queue.length > 0) {
            yield queue.shift()!;
            continue;
          }
          if (closed) return;
          await new Promise<void>((res) => { waiter = res; });
        }
      },
    };

    const cancel = async (): Promise<void> => {
      if (closed) return;
      child.kill('SIGTERM');
      await new Promise<void>((r) => setTimeout(r, 5000));
      if (!closed) child.kill('SIGKILL');
    };

    return {
      pid: child.pid!,
      events,
      exitCode: exit,
      cancel,
    };
  }
}
