import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    preload: 'src/preload.ts',
  },
  outDir: 'dist',
  format: ['cjs'],
  target: 'node20',
  platform: 'node',
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  external: ['electron', 'better-sqlite3', 'keytar', 'node-pty'],
  noExternal: [/^@tickitt\//, 'drizzle-orm', '@trpc/server', 'electron-trpc', 'superjson', 'zod'],
});