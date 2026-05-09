import { app, BrowserWindow } from 'electron';
import { createIPCHandler } from 'electron-trpc/main';
import { resolveAppPaths } from './paths.js';
import { initDatabase, closeDatabase } from './db/client.js';
import { appRouter } from './ipc/router.js';
import { createMainWindow } from './windows/main-window.js';
import { ConnectionService } from './services/connection-service.js';
import { TicketSyncService } from './services/ticket-sync-service.js';
import { RepoMutex } from './services/repo-mutex.js';
import { WorktreeService } from './services/worktree.service.js';
import { DiffService } from './services/diff.service.js';
import { AgentRegistry } from './agents/registry.js';
import { RunOrchestrator } from './runs/run.orchestrator.js';
import { RunStream } from './runs/run.stream.js';

app.setName('Tickitt');

let mainWindow: BrowserWindow | null = null;
const runStream = new RunStream();

async function bootstrap(): Promise<void> {
  const paths = resolveAppPaths();
  const db = await initDatabase(paths);

  const connectionService = new ConnectionService();
  const ticketSync = new TicketSyncService(db, connectionService);

  const repoMutex = new RepoMutex();
  const worktrees = new WorktreeService(db, paths, repoMutex);
  const diff = new DiffService();
  const registry = new AgentRegistry();
  const orchestrator = new RunOrchestrator(db, paths, worktrees, registry, runStream);

  // Recover any runs that were interrupted by an app restart
  const recovered = orchestrator.recoverOnBoot();
  if (recovered > 0) {
    console.warn(`Recovered ${recovered} run(s) marked as failed (interrupted by app restart)`);
  }

  await app.whenReady();

  mainWindow = createMainWindow();
  runStream.attach([mainWindow]);

  createIPCHandler({
    router: appRouter,
    windows: [mainWindow],
    createContext: async () => ({
      db, paths, connectionService, ticketSync,
      worktrees, diff, orchestrator,
    }),
  });

  ticketSync.startAll();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  closeDatabase();
});

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  app.exit(1);
});
