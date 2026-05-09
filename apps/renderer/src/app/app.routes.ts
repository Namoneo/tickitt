import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'runs',
    loadComponent: () => import('./pages/runs/runs.page').then((m) => m.RunsPage),
  },
  {
    path: 'runs/:id',
    loadComponent: () => import('./pages/runs/run-detail.page').then((m) => m.RunDetailPage),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  { path: '**', redirectTo: 'dashboard' },
];