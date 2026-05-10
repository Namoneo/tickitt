# Codex CLI Discovery Notes (2026-05-10)

## Version
Installed: codex v0.121.0 (via `npm install -g codex`)

## 1. Headless / Non-Interactive Invocation
- **Command**: `codex exec [OPTIONS] [PROMPT]`
- Reads prompt from:
  - CLI argument directly
  - stdin (pipe or `-`)
  - If both, stdin is appended as `<stdin>` block
- Key flags:
  - `--json` — Print events to stdout as JSONL (line-delimited JSON)
  - `--skip-git-repo-check` — Allow running outside a Git repository
  - `--dangerously-bypass-approvals-and-sandbox` — Auto-approve everything (matches Claude Code's `--dangerously-skip-permissions`)
  - `--sandbox <mode>` — `read-only` | `workspace-write` | `danger-full-access`
  - `--full-auto` — Alias for sandboxed auto-execution (`--sandbox workspace-write`)
  - `--ephemeral` — Run without persisting session files to disk

## 2. Structured Output
- **`--json`**: emits JSONL events to stdout. Each line is one JSON event with a `type` field.
- No `--output-format` flag; `--json` is the only structured mode.
- Discovered event types from a test run (auth failed, but structure visible):
  - `{"type":"thread.started","thread_id":"..."}`
  - `{"type":"turn.started"}`
  - `{"type":"error","message":"..."}`
  - `{"type":"turn.failed","error":{"message":"..."}}`

## 3. Session / Resume Semantics
- **`codex exec resume [SESSION_ID] [PROMPT]`** — Resume a previous session
- **`--last`** — Resume most recent session without specifying ID
- Sessions are persisted to `~/.codex/sessions/` (unless `--ephemeral`)
- Session ID is a UUID returned in `thread.started` event
- **Conclusion**: supportsContinuation = `true`

## 4. Permission / Sandbox Flags
- **`--dangerously-bypass-approvals-and-sandbox`** — Skip all prompts, execute unsandboxed (DANGEROUS)
- **`--sandbox workspace-write`** — Recommended safe default for agent use
- **`--full-auto`** — Convenience alias for low-friction sandboxed auto-execution

## 5. Auth Requirements
- Uses OpenAI auth (stored in `~/.codex/config.toml` after `codex login`)
- **No env var fallback** in current CLI; relies on persisted token
- The spec mentions `agents.envJson` but Codex's CLI doesn't read `OPENAI_API_KEY` directly for exec mode — it uses the stored refresh token
- For Tickitt integration: we can pre-authenticate via `codex login` before spawning, or wait for OpenAI to add env var support
- **Mitigation**: spawn Codex with `HOME` pointing to a temp dir where we pre-configure auth, or document that the user must `codex login` first

## 6. TTY Detection
- `--json` implies non-interactive mode; no TTY switching observed
- `--no-alt-screen` exists on the root command but **not** on `exec` subcommand
- In `--json` mode, Codex does not attempt to launch a TUI

## Decision
**Path A** — Codex has structured JSON output (`--json`) + headless mode (`exec`).
Use `child_process.spawn` like Claude Code. No `node-pty` needed.

## Open Question
Codex auth is OAuth-based (stored token), not API-key based. The `codex exec` command reads from `~/.codex/config.toml`. For Tickitt, we have two options:
1. Run `codex login` once during agent setup (interactive, one-time)
2. Document that the user must be pre-authenticated
3. (Future) OpenAI may add `--api-key` or env var support

For now, adapter assumes Codex is already authenticated on the machine.
