import {
  getErrorShape,
  type AnyRouter,
  type ProcedureType,
  type TRPCError,
} from '@trpc/server';

/**
 * electron-trpc calls `router.getErrorShape()`, which lived on the router in tRPC v10.
 * tRPC v11 exposes {@link getErrorShape} as a function and uses `router._def._config`.
 */
export function routerForElectronTrpc<T extends AnyRouter>(router: T): T {
  return new Proxy(router, {
    get(target, prop, receiver) {
      if (prop === 'getErrorShape') {
        return (opts: {
          error: TRPCError;
          type: ProcedureType | 'unknown';
          path: string | undefined;
          input: unknown;
          ctx: unknown;
        }) =>
          getErrorShape({
            config: target._def._config,
            ...opts,
          });
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as T;
}
