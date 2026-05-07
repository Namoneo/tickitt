import { app } from 'electron';
import os from 'node:os';
import { router, publicProcedure } from '../trpc.js';
import { Keychain } from '../../secrets/keychain.js';
import type { AppInfo, KeychainProbeResult } from '@tickitt/shared-types';

export const systemRouter = router({
  ping: publicProcedure.query(() => 'pong' as const),

  appInfo: publicProcedure.query(({ ctx }): AppInfo => ({
    name: 'Tickitt',
    version: app.getVersion(),
    electron: process.versions['electron'] ?? 'unknown',
    node: process.versions.node,
    chrome: process.versions['chrome'] ?? 'unknown',
    platform: process.platform,
    arch: os.arch(),
    userDataPath: ctx.paths.userData,
    workspacePath: ctx.paths.workspace,
    dbPath: ctx.paths.dbFile,
  })),

  keychainProbe: publicProcedure.mutation(async (): Promise<KeychainProbeResult> => {
    return Keychain.probe();
  }),
});