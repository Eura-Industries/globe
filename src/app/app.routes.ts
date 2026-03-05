import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.RegisterComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'board/:id',
    loadComponent: () => import('./features/board/board').then(m => m.BoardComponent),
    canActivate: [authGuard],
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'privacy',
    loadComponent: () => import('./features/privacy/privacy').then(m => m.PrivacyComponent),
  },
  {
    path: 'tos',
    loadComponent: () => import('./features/tos/tos').then(m => m.TosComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
