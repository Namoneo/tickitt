import { InjectionToken } from '@angular/core';
import type { Trpc } from './trpc.client';

/** @deprecated Use getTrpc() directly instead. Kept for backward compat. */
export const TRPC = new InjectionToken<Trpc>('TRPC');