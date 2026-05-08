import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { createGitFixture } from '../../test/git-fixture.js';
import { createTestDb } from '../../test/test-db.js';
import { WorktreeService } from './worktree.service.js';
import { RepoMutex } from './repo-mutex.js';
import { repos } from '@tickitt/db';

async function setup() {
  const fixture = await createGitFixture();
  const { db, close } = createTestDb();
  const [repoRow] = db.insert(repos).values({
    name: 'test-repo',
    remoteUrl: fixture.remotePath,
    defaultBranch: 'main',
    localPath: fixture.mainCheckoutPath,
  }).returning().all();

  if (!repoRow) throw new Error('Fixture insert failed');

  const paths = { userData: fixture.mainCheckoutPath, workspace: fixture.mainCheckoutPath, dbFile: '', logsDir: '' };
  const service = new WorktreeService(db, paths, new RepoMutex());
  return { fixture, db, close, repoRow, service };
}

describe('WorktreeService', () => {
  it('create() produces a worktree branched from origin/main', async () => {
    const { fixture, close, repoRow, service } = await setup();
    const info = await service.create({ repoId: repoRow.id, subdir: 'run-1', branchName: 'feat-1' });
    expect(info.branchName).toBe('feat-1');
    expect(info.baseBranch).toBe('main');
    expect(info.baseSha).toBeTruthy();
    const stat = await import('node:fs/promises').then((m) => m.stat(info.path));
    expect(stat.isDirectory()).toBe(true);
    await close();
    await fixture.cleanup();
  });

  it('create() rejects invalid branch name', async () => {
    const { fixture, close, repoRow, service } = await setup();
    await expect(
      service.create({ repoId: repoRow.id, subdir: 'run-bad', branchName: 'feat..x' }),
    ).rejects.toThrow('Invalid branch name');
    await close();
    await fixture.cleanup();
  });

  it('create() rejects when branch already exists locally', async () => {
    const { fixture, close, repoRow, service } = await setup();
    await service.create({ repoId: repoRow.id, subdir: 'run-2', branchName: 'feat-2' });
    await expect(
      service.create({ repoId: repoRow.id, subdir: 'run-3', branchName: 'feat-2' }),
    ).rejects.toThrow('already exists');
    await close();
    await fixture.cleanup();
  });

  it('create() rejects when destination path already exists', async () => {
    const { fixture, close, repoRow, service } = await setup();
    const fs = await import('node:fs/promises');
    const slug = fixture.mainCheckoutPath.split('/').pop()!;
    const existing = fixture.mainCheckoutPath.replace(slug, '') + 'worktrees/' + slug + '/run-4';
    await fs.mkdir(existing, { recursive: true });
    await expect(
      service.create({ repoId: repoRow.id, subdir: 'run-4', branchName: 'feat-4' }),
    ).rejects.toThrow('already exists');
    await close();
    await fixture.cleanup();
  });

  it('serialises two create() calls against same repoId', async () => {
    const { fixture, close, repoRow, service } = await setup();
    const order: number[] = [];
    const origRun = (service as any).mutex.run.bind((service as any).mutex);
    (service as any).mutex.run = async (key: string, fn: () => Promise<unknown>) => {
      order.push(1);
      await new Promise((r) => setTimeout(r, 10));
      const result = await origRun(key, fn);
      order.push(2);
      return result;
    };

    const p1 = service.create({ repoId: repoRow.id, subdir: 'run-a', branchName: 'feat-a' });
    const p2 = service.create({ repoId: repoRow.id, subdir: 'run-b', branchName: 'feat-b' });
    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2, 1, 2]);
    await close();
    await fixture.cleanup();
  });

  it('runs two create() calls against different repoIds concurrently', async () => {
    const { fixture, close, repoRow, service } = await setup();
    const fixture2 = await createGitFixture();
    const [repoRow2] = (service as any).db.insert(repos).values({
      name: 'test-repo-2',
      remoteUrl: fixture2.remotePath,
      defaultBranch: 'main',
      localPath: fixture2.mainCheckoutPath,
    }).returning().all();

    const start = Date.now();
    const p1 = service.create({ repoId: repoRow.id, subdir: 'run-c', branchName: 'feat-c' });
    const p2 = service.create({ repoId: repoRow2.id, subdir: 'run-d', branchName: 'feat-d' });
    await Promise.all([p1, p2]);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(800); // much less than sequential if they overlap
    await close();
    await fixture.cleanup();
    await fixture2.cleanup();
  });

  it('listForRepo() returns only worktrees, not main checkout', async () => {
    const { fixture, close, repoRow, service } = await setup();
    await service.create({ repoId: repoRow.id, subdir: 'run-e', branchName: 'feat-e' });
    const list = await service.listForRepo(repoRow.id);
    expect(list.length).toBe(1);
    expect(list[0]!.branch).toContain('feat-e');
    await close();
    await fixture.cleanup();
  });

  it('remove() deletes worktree and is idempotent', async () => {
    const { fixture, close, repoRow, service } = await setup();
    const info = await service.create({ repoId: repoRow.id, subdir: 'run-f', branchName: 'feat-f' });
    await service.remove({ repoId: repoRow.id, worktreePath: info.path, deleteBranch: false });
    const fs = await import('node:fs/promises');
    await expect(fs.access(info.path)).rejects.toThrow();
    // idempotent
    await expect(
      service.remove({ repoId: repoRow.id, worktreePath: info.path, deleteBranch: false }),
    ).resolves.toBeUndefined();
    await close();
    await fixture.cleanup();
  });

  it('deleteBranch() removes branch and is idempotent', async () => {
    const { fixture, close, repoRow, service } = await setup();
    await service.create({ repoId: repoRow.id, subdir: 'run-g', branchName: 'feat-g' });
    await service.deleteBranch(repoRow.id, 'feat-g');
    const g = (await import('simple-git')).default(fixture.mainCheckoutPath);
    const branches = await g.branchLocal();
    expect(branches.all).not.toContain('feat-g');
    // idempotent
    await expect(service.deleteBranch(repoRow.id, 'feat-g')).resolves.toBeUndefined();
    await close();
    await fixture.cleanup();
  });

  it('getStatus() returns clean=true after creation, clean=false after untracked file', async () => {
    const { fixture, close, repoRow, service } = await setup();
    const info = await service.create({ repoId: repoRow.id, subdir: 'run-h', branchName: 'feat-h' });
    const s1 = await service.getStatus(repoRow.id, info.path);
    expect(s1.clean).toBe(true);
    expect(s1.untrackedFiles).toBe(0);

    const fs = await import('node:fs/promises');
    await fs.writeFile(path.join(info.path, 'new.txt'), 'hello\n');
    const s2 = await service.getStatus(repoRow.id, info.path);
    expect(s2.clean).toBe(false);
    expect(s2.untrackedFiles).toBe(1);
    await close();
    await fixture.cleanup();
  });
});
