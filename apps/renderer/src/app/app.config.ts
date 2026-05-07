import { ApplicationConfig, provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { appRoutes } from './app.routes';
import { TRPC } from './core/ipc/trpc.token';
import { createTrpc } from './core/ipc/trpc.client';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(appRoutes, withComponentInputBinding()),
    { provide: TRPC, useFactory: () => createTrpc() },
  ],
};