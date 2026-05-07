export const isDev = !!process.env['ELECTRON_RENDERER_URL'] || process.env['NODE_ENV'] === 'development';
export const rendererUrl = process.env['ELECTRON_RENDERER_URL'] ?? 'http://localhost:4200';