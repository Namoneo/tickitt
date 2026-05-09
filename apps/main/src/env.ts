import { app } from 'electron';

export const isDev = !!process.env['ELECTRON_RENDERER_URL'] || process.env['NODE_ENV'] === 'development' || !app.isPackaged;
export const rendererUrl = process.env['ELECTRON_RENDERER_URL'] ?? 'http://127.0.0.1:4200';
