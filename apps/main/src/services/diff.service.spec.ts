import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import simpleGit from 'simple-git';
import { createGitFixture } from '../../test/git-fixture.js';
import { createTestDb } from '../../test/test-db.js';
import { WorktreeService } from './worktree.service.js';
import { DiffService } from './diff.service.js';
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
  const worktree = new WorktreeService(db, paths, new RepoMutex());
  const diff = new DiffService();
  return { fixture, db, close, repoRow, worktree, diff };
}

describe('DiffService', () => {
  it('summary() reports a modified file with correct additions/deletions', async () => {
    const { fixture, close, repoRow, worktree, diff } = await setup();
    const info = await worktree.create({ repoId: repoRow.id, subdir: 'run-1', branchName: 'diff-1' });
    await fs.writeFile(path.join(info.path, 'README.md'), '# fixture\nextra line\n');
    const summary = await diff.summary(info.path, info.baseSha);
    const file = summary.files.find((f) => f.path === 'README.md');
    expect(file).toBeDefined();
    expect(file!.status).toBe('modified');
    expect(file!.additions).toBeGreaterThan(0);
    expect(file!.deletions).toBeGreaterThanOrEqual(0);
    await close();
    await fixture.cleanup();
  });

  it('summary() reports an added committed file as added, not untracked', async () => {
    const { fixture, close, repoRow, worktree, diff } = await setup();
    const info = await worktree.create({ repoId: repoRow.id, subdir: 'run-2', branchName: 'diff-2' });
    await fs.writeFile(path.join(info.path, 'new.md'), '# new\n');
    const g = simpleGit(info.path);
    await g.add('.');
    await g.commit('add new.md', ['--no-verify']);
    const summary = await diff.summary(info.path, info.baseSha);
    const file = summary.files.find((f) => f.path === 'new.md');
    expect(file).toBeDefined();
    expect(file!.status).toBe('added');
    expect(file!.isUntracked).toBe(false);
    await close();
    await fixture.cleanup();
  });

  it('summary() reports an untracked file as added, isUntracked: true', async () => {
    const { fixture, close, repoRow, worktree, diff } = await setup();
    const info = await worktree.create({ repoId: repoRow.id, subdir: 'run-3', branchName: 'diff-3' });
    await fs.writeFile(path.join(info.path, 'untracked.txt'), 'line1\nline2\nline3\n');
    const summary = await diff.summary(info.path, info.baseSha);
    const file = summary.files.find((f) => f.path === 'untracked.txt');
    expect(file).toBeDefined();
    expect(file!.status).toBe('added');
    expect(file!.isUntracked).toBe(true);
    expect(file!.additions).toBe(3);
    await close();
    await fixture.cleanup();
  });

  it('summary() reports a deleted file', async () => {
    const { fixture, close, repoRow, worktree, diff } = await setup();
    const info = await worktree.create({ repoId: repoRow.id, subdir: 'run-4', branchName: 'diff-4' });
    await fs.unlink(path.join(info.path, 'README.md'));
    const g = simpleGit(info.path);
    await g.add('.');
    await g.commit('delete readme', ['--no-verify']);
    const summary = await diff.summary(info.path, info.baseSha);
    const file = summary.files.find((f) => f.path === 'README.md');
    expect(file).toBeDefined();
    expect(file!.status).toBe('deleted');
    await close();
    await fixture.cleanup();
  });

  it('summary() reports a renamed file with oldPath and path', async () => {
    const { fixture, close, repoRow, worktree, diff } = await setup();
    const info = await worktree.create({ repoId: repoRow.id, subdir: 'run-5', branchName: 'diff-5' });
    await fs.rename(path.join(info.path, 'README.md'), path.join(info.path, 'README-renamed.md'));
    const g = simpleGit(info.path);
    await g.add('.');
    await g.commit('rename', ['--no-verify']);
    const summary = await diff.summary(info.path, info.baseSha);
    const file = summary.files.find((f) => f.status === 'renamed');
    expect(file).toBeDefined();
    expect(file!.oldPath).toBe('README.md');
    expect(file!.path).toBe('README-renamed.md');
    await close();
    await fixture.cleanup();
  });

  it('summary() flags a binary file as isBinary: true', async () => {
    const { fixture, close, repoRow, worktree, diff } = await setup();
    const info = await worktree.create({ repoId: repoRow.id, subdir: 'run-6', branchName: 'diff-6' });
    await fs.writeFile(path.join(info.path, 'binary.bin'), Buffer.from([0x00, 0x01, 0x00]));
    const summary = await diff.summary(info.path, info.baseSha);
    const file = summary.files.find((f) => f.path === 'binary.bin');
    expect(file).toBeDefined();
    expect(file!.isBinary).toBe(true);
    expect(file!.additions).toBe(0);
    expect(file!.deletions).toBe(0);
    await close();
    await fixture.cleanup();
  });

  it('fileDiff() for a tracked text change returns a patch', async () => {
    const { fixture, close, repoRow, worktree, diff } = await setup();
    const info = await worktree.create({ repoId: repoRow.id, subdir: 'run-7', branchName: 'diff-7' });
    await fs.writeFile(path.join(info.path, 'README.md'), '# fixture\nextra\n');
    const result = await diff.fileDiff(info.path, info.baseSha, 'README.md');
    expect(result.status).toBe('modified');
    expect(result.patch).toContain('+');
    expect(result.truncated).toBe(false);
    await close();
    await fixture.cleanup();
  });

  it('fileDiff() for a binary file returns patch: null, isBinary: true', async () => {
    const { fixture, close, repoRow, worktree, diff } = await setup();
    const info = await worktree.create({ repoId: repoRow.id, subdir: 'run-8', branchName: 'diff-8' });
    await fs.writeFile(path.join(info.path, 'binary.bin'), Buffer.from([0x00, 0x01, 0x00]));
    const result = await diff.fileDiff(info.path, info.baseSha, 'binary.bin');
    expect(result.isBinary).toBe(true);
    expect(result.patch).toBeNull();
    await close();
    await fixture.cleanup();
  });

  it('fileDiff() for a tracked text change above 500 KB returns truncated', async () => {
    const { fixture, close, repoRow, worktree, diff } = await setup();
    const info = await worktree.create({ repoId: repoRow.id, subdir: 'run-9', branchName: 'diff-9' });
    const bigContent = 'a'.repeat(600_000);
    await fs.writeFile(path.join(info.path, 'big.txt'), bigContent);
    const g = simpleGit(info.path);
    await g.add('.');
    await g.commit('add big file', ['--no-verify']);
    const result = await diff.fileDiff(info.path, info.baseSha, 'big.txt');
    expect(result.truncated).toBe(true);
    expect(result.patch).toBeNull();
    expect(result.bytes).toBeGreaterThan(500_000);
    await close();
    await fixture.cleanup();
  });

  it('fileDiff() for an untracked text file under 100 KB returns a synthesised patch', async () => {
    const { fixture, close, repoRow, worktree, diff } = await setup();
    const info = await worktree.create({ repoId: repoRow.id, subdir: 'run-10', branchName: 'diff-10' });
    await fs.writeFile(path.join(info.path, 'untracked.txt'), 'hello\nworld\n');
    const result = await diff.fileDiff(info.path, info.baseSha, 'untracked.txt');
    expect(result.status).toBe('added');
    expect(result.isUntracked).toBe(true);
    expect(result.patch).toContain('diff --git');
    expect(result.truncated).toBe(false);
    await close();
    await fixture.cleanup();
  });

  it('fileDiff() for an untracked text file above 100 KB returns truncated', async () => {
    const { fixture, close, repoRow, worktree, diff } = await setup();
    const info = await worktree.create({ repoId: repoRow.id, subdir: 'run-11', branchName: 'diff-11' });
    const bigContent = 'x'.repeat(150_000);
    await fs.writeFile(path.join(info.path, 'big-untracked.txt'), bigContent);
    const result = await diff.fileDiff(info.path, info.baseSha, 'big-untracked.txt');
    expect(result.isUntracked).toBe(true);
    expect(result.truncated).toBe(true);
    expect(result.patch).toBeNull();
    await close();
    await fixture.cleanup();
  });

  it('summary() uses baseRef SHA correctly when default branch advances', async () => {
    const { fixture, close, repoRow, worktree, diff } = await setup();
    const info = await worktree.create({ repoId: repoRow.id, subdir: 'run-12', branchName: 'diff-12' });

    // Advance origin/main after worktree creation
    const mainG = simpleGit(fixture.mainCheckoutPath);
    await fs.writeFile(path.join(fixture.mainCheckoutPath, 'new-on-main.txt'), 'mainline\n');
    await mainG.add('.');
    await mainG.commit('advance main');
    await mainG.push('origin', 'main');

    const summary = await diff.summary(info.path, info.baseSha);
    // Worktree is unchanged relative to its creation baseSha, so diff should be empty
    // (no tracked changes, no untracked)
    const tracked = summary.files.filter((f) => !f.isUntracked);
    expect(tracked).toHaveLength(0);
    await close();
    await fixture.cleanup();
  });
});
