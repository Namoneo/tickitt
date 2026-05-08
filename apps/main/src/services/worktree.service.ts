import fs from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import slugify from 'slugify';
import { repos, type Db } from '@tickitt/db';
import type { AppPaths } from '../paths.js';
import { fetchBaseBranch, git, isValidBranchName, refExists } from './git-helpers.js';
import type { RepoMutex } from './repo-mutex.js';

export interface CreateWorktreeInput {
  repoId: string;
  /** Subdirectory name under workspace/worktrees/<repo-slug>/. Use the run id. */
  subdir: string;
  branchName: string;
  /** Optional override; defaults to repo's defaultBranch. */
  base?: string;
}

export interface WorktreeInfo {
  path: string;
  branchName: string;
  baseBranch: string;
  /** SHA the branch was created from. Useful for diff base when default branch advances. */
  baseSha: string;
  repoId: string;
}

export interface WorktreeStatus {
  clean: boolean;
  /** Files modified (tracked) in working tree, staged or unstaged. */
  changedFiles: number;
  untrackedFiles: number;
  ahead: number;
  behind: number;
}

export class WorktreeService {
  constructor(
    private readonly db: Db,
    private readonly paths: AppPaths,
    private readonly mutex: RepoMutex,
  ) {}

  worktreesRoot(): string {
    return path.join(this.paths.workspace, 'worktrees');
  }

  async create(input: CreateWorktreeInput): Promise<WorktreeInfo> {
    return this.mutex.run(input.repoId, async () => {
      const repo = await this.requireRepo(input.repoId);
      const validName = await isValidBranchName(input.branchName);
      if (!validName) throw new Error(`Invalid branch name: ${input.branchName}`);

      const slug = path.basename(repo.localPath);
      const wtRoot = path.join(this.worktreesRoot(), slug);
      const wtPath = path.join(wtRoot, input.subdir);

      const exists = await pathExists(wtPath);
      if (exists) throw new Error(`Worktree path already exists: ${wtPath}`);

      const base = input.base ?? repo.defaultBranch;
      await fetchBaseBranch(repo.localPath, base);

      const baseRef = `origin/${base}`;
      if (!(await refExists(repo.localPath, baseRef))) {
        throw new Error(`Base ref not found after fetch: ${baseRef}`);
      }

      if (await refExists(repo.localPath, `refs/heads/${input.branchName}`)) {
        throw new Error(`Branch already exists locally: ${input.branchName}`);
      }

      await fs.mkdir(wtRoot, { recursive: true });
      await git(repo.localPath).raw([
        'worktree', 'add',
        '-b', input.branchName,
        wtPath,
        baseRef,
      ]);

      const baseSha = (await git(repo.localPath).raw(['rev-parse', baseRef])).trim();
      return {
        path: wtPath,
        branchName: input.branchName,
        baseBranch: base,
        baseSha,
        repoId: input.repoId,
      };
    });
  }

  /**
   * Lists worktrees as known to git for a given repo. Excludes the main
   * checkout itself.
   */
  async listForRepo(repoId: string): Promise<Array<{ path: string; branch: string }>> {
    const repo = await this.requireRepo(repoId);
    const out = await git(repo.localPath).raw(['worktree', 'list', '--porcelain']);
    return parseWorktreeList(out, repo.localPath);
  }

  async remove(opts: { repoId: string; worktreePath: string; deleteBranch: boolean }): Promise<void> {
    return this.mutex.run(opts.repoId, async () => {
      const repo = await this.requireRepo(opts.repoId);
      await git(repo.localPath).raw(['worktree', 'remove', '--force', opts.worktreePath])
        .catch(async () => {
          await git(repo.localPath).raw(['worktree', 'prune']);
        });
    });
  }

  async deleteBranch(repoId: string, branchName: string): Promise<void> {
    return this.mutex.run(repoId, async () => {
      const repo = await this.requireRepo(repoId);
      await git(repo.localPath).raw(['branch', '-D', branchName])
        .catch(() => undefined); // idempotent
    });
  }

  async getStatus(repoId: string, worktreePath: string): Promise<WorktreeStatus> {
    const repo = await this.requireRepo(repoId);
    const g = git(worktreePath);
    const status = await g.status();
    const changed = status.modified.length + status.staged.length + status.deleted.length + status.renamed.length + status.conflicted.length;
    const branch = await g.revparse(['--abbrev-ref', 'HEAD']);
    const tracking = `origin/${branch}`;
    let ahead = 0;
    let behind = 0;
    try {
      const rev = await g.raw(['rev-list', '--left-right', '--count', `${tracking}...HEAD`]);
      const [b, a] = rev.trim().split(/\s+/).map((x) => parseInt(x, 10));
      ahead = a ?? 0;
      behind = b ?? 0;
    } catch {
      // no tracking branch
    }
    return {
      clean: status.isClean(),
      changedFiles: changed,
      untrackedFiles: status.not_added.length,
      ahead,
      behind,
    };
  }

  private async requireRepo(repoId: string) {
    const rows = await this.db.select().from(repos).where(eq(repos.id, repoId)).limit(1);
    const repo = rows[0];
    if (!repo) throw new Error(`Repo not found: ${repoId}`);
    return repo;
  }
}

// ---------- helpers ----------
function parseWorktreeList(raw: string, mainPath: string) {
  const lines = raw.split('\n');
  const entries: Array<{ path: string; branch: string }> = [];
  let current: { path: string; branch: string } | null = null;
  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      if (current && current.path !== mainPath) entries.push(current);
      current = { path: line.slice(9).trim(), branch: '' };
    }
    if (line.startsWith('branch ')) {
      if (current) current.branch = line.slice(7).trim();
    }
  }
  if (current && current.path !== mainPath) entries.push(current);
  return entries;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
