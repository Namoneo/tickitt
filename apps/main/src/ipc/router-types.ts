// This file exists only to provide a type-only re-export point.
// It prevents the renderer from needing to resolve the full implementation graph
// (drizzle-orm, etc.) when importing the AppRouter type.

import type { router } from './trpc.js';

// We use a deferred type pattern to avoid pulling in dependencies
export type AppRouter = ReturnType<typeof router> extends infer R ? R : never;
