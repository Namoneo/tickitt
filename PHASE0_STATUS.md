# Phase 0 Status

## ✅ Completed

### Repository Structure
- Git initialized, root configs in place
- Workspace structure: `apps/` (main, renderer), `packages/` (db, ipc-contract, shared-types)

### Packages
1. **@tickitt/db** — Schema, migrations generated, Drizzle config
2. **@tickitt/shared-types** — AppInfo, KeychainProbeResult
3. **@tickitt/ipc-contract** — AppRouter type re-export

### Main Process (apps/main)
- tRPC router with system, connections, agents, repos routers
- Keychain wrapper using keytar
- Database client with migrations
- Electron bootstrap + window management
- Preload script for electron-trpc

### Renderer (apps/renderer)
- Angular 19, standalone, zoneless (signals-only)
- tRPC client via ipcLink
- Shell layout with navigation
- Pages: Dashboard, Runs, Settings
- Settings sections: Diagnostics (live), Connections, Agents, Repos (placeholders)

### Build System
- Root package.json with workspace scripts
- tsup for main process bundling (CJS)
- Angular CLI for renderer
- electron-builder config for packaging

## ⚠️ Pending: Native Module Rebuild

`better-sqlite3` was compiled for Node.js 137 (system Node v24) but Electron 33 uses Node.js 130. Requires rebuild for Electron ABI.

### Fix Commands

```bash
# Option 1: Using electron-rebuild
npx electron-rebuild -f -w better-sqlite3 -w keytar

# Option 2: Using node-gyp directly
cd node_modules/better-sqlite3
npx node-gyp rebuild --release --target=33.4.11 --runtime=electron --dist-url=https://electronjs.org/headers

# Option 3: Using electron-builder's beforePack hook (already configured in electron-builder.yml)
pnpm package:dir  # This should trigger native rebuild during packaging
```

## Verification Steps

After native rebuild:

1. `pnpm dev` — Should open Electron window with Angular on localhost:4200
2. Navigate to Settings → Diagnostics
3. Click "Load app info" — Should show JSON with paths
4. Click "Probe keychain" — Should show "OK"
5. `pnpm typecheck` — Should pass
6. `pnpm build` — Should produce main/dist and renderer/dist
7. `pnpm package:dir` — Should produce release/mac-arm64/Tickitt.app

## Notes

- Removed superjson transformer (tRPC v11 moved it to links; electron-trpc v0.7 doesn't expose it)
- Can re-add superjson in Phase 1 by upgrading electron-trpc or patching the link
- Keytar requires same Electron rebuild as better-sqlite3
