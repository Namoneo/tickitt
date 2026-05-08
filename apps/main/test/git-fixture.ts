import { dir } from 'tmp-promise';
import path from 'node:path';
import simpleGit from 'simple-git';
import fs from 'node:fs/promises';

export interface Fixture {
  remotePath: string;
  mainCheckoutPath: string;
  cleanup: () => Promise<void>;
}

export async function createGitFixture(opts?: { defaultBranch?: string }): Promise<Fixture> {
  const branch = opts?.defaultBranch ?? 'main';
  const remote = await dir({ unsafeCleanup: true });
  await simpleGit(remote.path).init(['--bare']);
  await simpleGit(remote.path).raw(['symbolic-ref', 'HEAD', `refs/heads/${branch}`]);

  const main = await dir({ unsafeCleanup: true });
  const g = simpleGit(main.path);
  await g.clone(remote.path, main.path);
  await fs.writeFile(path.join(main.path, 'README.md'), '# fixture\n');
  await g.add('.');
  await g.addConfig('user.email', 'test@example.com');
  await g.addConfig('user.name', 'Test');
  await g.commit('initial');
  await g.push('origin', branch, ['--set-upstream']);

  return {
    remotePath: remote.path,
    mainCheckoutPath: main.path,
    cleanup: async () => {
      await remote.cleanup();
      await main.cleanup();
    },
  };
}
