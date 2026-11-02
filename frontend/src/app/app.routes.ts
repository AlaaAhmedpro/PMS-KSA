import { Routes } from '@angular/router';
import { demoAuthGuard } from './core/auth/demo-auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./products/website/website-shell.page').then((m) => m.WebsiteShellPage),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./products/website/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'features',
        loadComponent: () =>
          import('./products/website/features/features.page').then((m) => m.FeaturesPage),
      },
      {
        path: 'pricing',
        loadComponent: () =>
          import('./products/website/pricing/pricing.page').then((m) => m.PricingPage),
      },
      {
        path: 'demo',
        loadComponent: () =>
          import('./products/website/demo/demo-request.page').then((m) => m.DemoRequestPage),
      },
    ],
  },
  {
    path: 'app/login',
    loadComponent: () =>
      import('./products/app/login/app-login.page').then((m) => m.AppLoginPage),
  },
  {
    path: 'app',
    canActivate: [demoAuthGuard('app')],
    loadComponent: () =>
      import('./products/app/app-shell.page').then((m) => m.AppShellPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./products/app/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'employees',
        loadComponent: () =>
          import('./products/app/employees/employees.page').then((m) => m.EmployeesPage),
      },
      {
        path: 'employees/new',
        loadComponent: () =>
          import('./products/app/employees/employee-form.page').then((m) => m.EmployeeFormPage),
      },
    ],
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./products/admin/login/admin-login.page').then((m) => m.AdminLoginPage),
  },
  {
    path: 'admin',
    canActivate: [demoAuthGuard('admin')],
    loadComponent: () =>
      import('./products/admin/admin-shell.page').then((m) => m.AdminShellPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./products/admin/dashboard/admin-dashboard.page').then((m) => m.AdminDashboardPage),
      },
      {
        path: 'tenants',
        loadComponent: () =>
          import('./products/admin/tenants/tenants.page').then((m) => m.TenantsPage),
      },
      {
        path: 'plans',
        loadComponent: () =>
          import('./products/admin/plans/plans.page').then((m) => m.PlansPage),
      },
      {
        path: 'demo-requests',
        loadComponent: () =>
          import('./products/admin/demo-requests/demo-requests.page').then((m) => m.DemoRequestsPage),
      },
    ],
  },
  {
    path: 'design-system',
    loadComponent: () =>
      import('./pages/design-system/design-system.page').then((m) => m.DesignSystemPage),
  },
  { path: '**', redirectTo: '' },
];
