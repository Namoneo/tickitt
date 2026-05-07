import simpleGit from 'simple-git';
import fs from 'node:fs';
import path from 'node:path';

export interface CloneOptions {
  remoteUrl: string;
  localPath: string;
}

export class RepoCloneService {
  async clone(opts: CloneOptions): Promise<void> {
    if (fs.existsSync(opts.localPath)) {
      throw new Error(`Path already exists: ${opts.localPath}`);
    }
    fs.mkdirSync(path.dirname(opts.localPath), { recursive: true });
    await simpleGit().clone(opts.remoteUrl, opts.localPath, ['--depth', '1']);
  }

  async getDefaultBranch(localPath: string): Promise<string> {
    const git = simpleGit(localPath);
    const summary = await git.branchLocal();
    return summary.current ?? 'main';
  }
}