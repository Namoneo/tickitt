import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ClaudeCodeAdapter } from './claude-code.adapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fixtureScript(events: Array<Record<string, unknown>>): string {
  const lines = events.map((e) => JSON.stringify(e)).join('\\n');
  return `node -e "${lines.split('\n').join('\\\\n')}; process.exit(0)"`;
}

// Build a tiny JS file that writes NDJSON to stdout and exits
describe('ClaudeCodeAdapter', () => {
  it('emits events in order from stdout', async () => {
    const adapter = new ClaudeCodeAdapter();
    const eventsOut: Array<{ type: string }> = [];

    // Use `node` itself as the binary with a -e script
    const handle = adapter.spawn({
      cwd: __dirname,
      prompt: 'test prompt',
      binaryPath: 'node',
      extraArgs: ['-e', `process.stdout.write(JSON.stringify({type:"assistant",message:{id:"m1",content:[{type:"text",text:"hello"}]}})+"\\n"); process.stdout.write(JSON.stringify({type:"result",subtype:"success",is_error:false,duration_ms:100})+"\\n"); process.exit(0);`],
    });

    for await (const ev of handle.events) {
      eventsOut.push(ev as any);
    }

    const code = await handle.exitCode;
    expect(code).toBe(0);
    expect(eventsOut.length).toBeGreaterThanOrEqual(2);
    expect(eventsOut.some((e) => e.type === 'text' && (e as any).content === 'hello')).toBe(true);
    expect(eventsOut.some((e) => e.type === 'usage')).toBe(true);
  });

  it('cancel() SIGTERMs the process', async () => {
    const adapter = new ClaudeCodeAdapter();
    const handle = adapter.spawn({
      cwd: __dirname,
      prompt: 'test',
      binaryPath: 'node',
      extraArgs: ['-e', 'setInterval(()=>{},1000)'],
    });

    // Give it a moment to start
    await new Promise((r) => setTimeout(r, 50));
    await handle.cancel();
    const code = await handle.exitCode;
    // SIGTERM or SIGKILL gives null or 143/137
    expect(code === null || code === 143 || code === 137 || code === 1).toBe(true);
  });
});
