import { Routes } from '@angular/router';

const calculator = () => import('./components/calculator/calculator').then((m) => m.Calculator);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'basic' },
  {
    path: 'basic',
    title: 'Basic · Pink Calculator',
    loadComponent: calculator,
    data: { scientific: false },
  },
  {
    path: 'scientific',
    title: 'Scientific · Pink Calculator',
    loadComponent: calculator,
    data: { scientific: true },
  },
  {
    path: 'graph',
    title: 'Graph · Pink Calculator',
    loadComponent: () => import('./components/graph/graph').then((m) => m.Graph),
  },
  {
    path: 'tools/calculus',
    title: 'Calculus · Pink Calculator',
    loadComponent: () => import('./features/calculus/calculus').then((m) => m.Calculus),
  },
  {
    path: 'tools/matrices',
    title: 'Matrices · Pink Calculator',
    loadComponent: () =>
      import('./features/linear-algebra/linear-algebra').then((m) => m.LinearAlgebra),
  },
  {
    path: 'tools/engineering',
    title: 'Engineering · Pink Calculator',
    loadComponent: () => import('./features/engineering/engineering').then((m) => m.Engineering),
  },
  { path: '**', redirectTo: 'basic' },
];
