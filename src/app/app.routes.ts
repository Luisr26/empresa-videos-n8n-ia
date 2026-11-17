import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then((m) => m.Dashboard)
      },
      {
        path: 'generador',
        loadComponent: () =>
          import('./pages/generador-guion/generador-guion').then((m) => m.GeneradorGuion)
      },
      {
        path: 'aprobados',
        loadComponent: () =>
          import('./pages/guiones-aprobados/guiones-aprobados').then((m) => m.GuionesAprobados)
      }
    ]
  }
];