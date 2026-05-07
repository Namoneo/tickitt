import { InjectionToken } from '@angular/core';
import type { Trpc } from './trpc.client';

export const TRPC = new InjectionToken<Trpc>('TRPC');