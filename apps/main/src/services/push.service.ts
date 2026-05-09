import { eq } from 'drizzle-orm';
import { connections, repos, runs, tickets, type Db, type Connection, type Repo, type Run, type Ticket } from '@tickitt/db';
import simpleGit from 'simple-git';
import path from 'node:path';
import { Keychain } from '../secrets/keychain.js';
import type { ConnectionService } from './connection-service.js';

export interface ApproveInput {
  runId: string;
  /** Optional override; defaults to "<key>: <title>". */
  commitMessage?: string;
}

export interface ApproveResult {
  prUrl: string;
  pushedAt: Date;
  jiraCommentOk: boolean;
  jiraTransitionResult?: { ok: boolean; appliedName?: string; available?: string[] } | undefined;
}

export class PushService {
  constructor(
    private readonly db: Db,
    private readonly connections: ConnectionService,
  ) {}

  async approve(input: ApproveInput): Promise<ApproveResult> {
    const run = this.requireRun(input.runId);
    if (run.state !== 'awaiting_review') {
      throw new Error(`Run ${run.id} is in state ${run.state}; only awaiting_review is allowed`);
    }
    const repo = this.requireRepo(run.repoId);
    const ticket = this.requireTicket(run.ticketId);
    const ghConn = this.resolveGithubConnection(repo);
    const pat = await Keychain.get(ghConn.secretRef);
    if (!pat) throw new Error(`GitHub PAT missing in keychain for connection ${ghConn.id}`);

    const { owner, name } = parseRemote(repo.remoteUrl);

    // 1. Stage and commit any uncommitted changes in the worktree.
    const wt = simpleGit(run.worktreePath);
    await wt.add(['-A']);
    const status = await wt.status();
    if (!status.isClean() || status.staged.length > 0 || status.created.length > 0 || status.modified.length > 0 || status.deleted.length > 0) {
      const msg = input.commitMessage ?? `${ticket.key}: ${ticket.title}\n\n(Auto-committed by Tickitt)`;
      await wt.addConfig('user.email', `${owner}@users.noreply.github.com`, false, 'local');
      await wt.addConfig('user.name', 'Tickitt', false, 'local').catch(() => undefined);
      await wt.commit(msg);
    }

    // 2. Push with PAT-injected URL (temporary).
    const authUrl = `https://x-access-token:${pat}@github.com/${owner}/${name}.git`;
    try {
      await wt.push(authUrl, `HEAD:refs/heads/${run.branchName}`, ['-u']);
    } catch (err) {
      throw new Error(`git push failed: ${(err as Error).message}`);
    }

    const pushedAt = new Date();

    // 3. Create the PR.
    const codeHost = await this.connections.getCodeHost(ghConn.id);
    const pr = await codeHost.createPullRequest({
      owner,
      repo: name,
      title: `${ticket.key}: ${ticket.title}`,
      body: prBody(ticket, run),
      head: run.branchName,
      base: repo.defaultBranch,
    });

    // 4. Comment on Jira (best-effort).
    let jiraCommentOk = false;
    try {
      const ticketSource = await this.connections.getTicketSource(this.requireConnection(ticket.connectionId).id);
      await ticketSource.addCommentLinkingPr(ticket.key, pr.htmlUrl, ticket.title);
      jiraCommentOk = true;
    } catch {
      jiraCommentOk = false;
    }

    // 5. Transition Jira (optional, best-effort).
    let jiraTransitionResult: ApproveResult['jiraTransitionResult'];
    const ticketConn = this.requireConnection(ticket.connectionId);
    const jiraCfg = ticketConn.configJson as { transitionOnPrOpen?: string };
    if (jiraCfg.transitionOnPrOpen) {
      try {
        const ts = await this.connections.getTicketSource(ticketConn.id);
        const r = await ts.transitionByName(ticket.key, jiraCfg.transitionOnPrOpen);
        jiraTransitionResult = r.ok
          ? { ok: true, appliedName: jiraCfg.transitionOnPrOpen }
          : { ok: false, available: r.available ?? [] };
      } catch (err) {
        jiraTransitionResult = { ok: false };
      }
    }

    // 6. Persist to run.
    this.db.update(runs).set({ prUrl: pr.htmlUrl, pushedAt }).where(eq(runs.id, run.id)).run();

    return { prUrl: pr.htmlUrl, pushedAt, jiraCommentOk, jiraTransitionResult };
  }

  private requireRun(id: string): Run {
    const [row] = this.db.select().from(runs).where(eq(runs.id, id)).all();
    if (!row) throw new Error(`Run ${id} not found`);
    return row;
  }
  private requireRepo(id: string): Repo {
    const [row] = this.db.select().from(repos).where(eq(repos.id, id)).all();
    if (!row) throw new Error(`Repo ${id} not found`);
    return row;
  }
  private requireTicket(id: string): Ticket {
    const [row] = this.db.select().from(tickets).where(eq(tickets.id, id)).all();
    if (!row) throw new Error(`Ticket ${id} not found`);
    return row;
  }
  private requireConnection(id: string): Connection {
    const [row] = this.db.select().from(connections).where(eq(connections.id, id)).all();
    if (!row) throw new Error(`Connection ${id} not found`);
    return row;
  }
  private resolveGithubConnection(repo: Repo): Connection {
    if (repo.githubConnectionId) {
      return this.requireConnection(repo.githubConnectionId);
    }
    const [first] = this.db.select().from(connections)
      .where(eq(connections.kind, 'github'))
      .all();
    if (!first) throw new Error('No GitHub connection configured');
    return first;
  }
}

function parseRemote(url: string): { owner: string; name: string } {
  const m = url.match(/[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!m) throw new Error(`Cannot parse remote: ${url}`);
  return { owner: m[1]!, name: m[2]! };
}

function prBody(ticket: Ticket, run: Run) {
  const lines = [
    `Closes [${ticket.key}](${ticket.url}).`,
    '',
  ];
  if (ticket.body?.trim()) {
    lines.push('## Description', '', ticket.body.trim(), '');
  }
  lines.push('---', `_Generated by Tickitt — branch \`${run.branchName}\`._`);
  return lines.join('\n');
}
