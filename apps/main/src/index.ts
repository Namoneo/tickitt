import { app, BrowserWindow } from 'electron';
import { createIPCHandler } from 'electron-trpc/main';
import { resolveAppPaths } from './paths.js';
import { initDatabase, closeDatabase } from './db/client.js';
import { appRouter } from './ipc/router.js';
import { createMainWindow } from './windows/main-window.js';
import { ConnectionService } from './services/connection-service.js';
import { TicketSyncService } from './services/ticket-sync-service.js';

app.setName('Tickitt');

let mainWindow: BrowserWindow | null = null;

async function bootstrap(): Promise<void> {
  const paths = resolveAppPaths();
  const db = await initDatabase(paths);

  const connectionService = new ConnectionService();
  const ticketSync = new TicketSyncService(db, connectionService);

  await app.whenReady();

  mainWindow = createMainWindow();

  createIPCHandler({
    router: appRouter,
    windows: [mainWindow],
    createContext: async () => ({ db, paths, connectionService, ticketSync }),
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