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
    if (opts.resumeSessionId) {
      args.push('--resume', opts.resumeSessionId);
    }
    const child = spawn(opts.binaryPath, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env, FORCE_COLOR: '0' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Write the prompt to stdin and close.
    child.stdin!.on('error', () => {}); // suppress EPIPE if process exits before reading
    child.stdin!.write(opts.prompt);
    child.stdin!.end();

    const queue: AgentEvent[] = [];
    let waiter: (() => void) | null = null;
    let closed = false;

    const emit = (e: AgentEvent): void => {
      queue.push(e);
      if (waiter) { const w = waiter; waiter = null; w(); }
    };

    // Session ID capture for continuation (P4)
    let sessionIdResolver!: (v: string | null) => void;
    const sessionIdPromise = new Promise<string | null>((res) => { sessionIdResolver = res; });
    let sessionIdResolved = false;
    const resolveSession = (v: string | null): void => {
      if (!sessionIdResolved) { sessionIdResolved = true; sessionIdResolver(v); }
    };

    const stdoutParser = child.stdout!.pipe(ndjson.parse({ strict: false }));
    stdoutParser.on('data', (raw: CCStreamEvent) => {
      // Capture session_id from system.init for continuation
      if (raw.type === 'system' && (raw as any).subtype === 'init') {
        resolveSession((raw as any).session_id ?? null);
      }
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
        if (stderrBuf.trim()) emit({ type: 'system', subtype: 'stderr', data: stderrBuf.trim() });
        closed = true;
        if (waiter) { const w = waiter; waiter = null; w(); }
        resolveSession(null); // ensure sessionId resolves even if init never arrived
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
      sessionId: sessionIdPromise,
    };
  }
}
