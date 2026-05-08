import { spawn } from 'node:child_process';
import simpleGit, { SimpleGit } from 'simple-git';

export function git(cwd: string): SimpleGit {
  return simpleGit({ baseDir: cwd, binary: 'git', maxConcurrentProcesses: 1 });
}

export function isValidBranchName(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('git', ['check-ref-format', '--branch', name], { stdio: 'ignore' });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

export async function fetchBaseBranch(repoPath: string, branch: string): Promise<void> {
  await git(repoPath).fetch('origin', branch);
}

export async function refExists(repoPath: string, ref: string): Promise<boolean> {
  try {
    await git(repoPath).raw(['rev-parse', '--verify', '--quiet', ref]);
    return true;
  } catch {
    return false;
  }
}
