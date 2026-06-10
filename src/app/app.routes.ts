import { Routes } from '@angular/router';

import { featureKeys } from './core/config/feature-keys';
import { catalogPermissions, reportPermissions } from './core/config/permission-keys';
import { authGuard } from './core/guards/auth.guard';
import { featureEntitlementGuard } from './core/guards/feature-entitlement.guard';
import { guestGuard } from './core/guards/guest.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { tenantContextGuard } from './core/guards/tenant-context.guard';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/login-page/login-page').then((m) => m.LoginPage)
  },
  {
    path: 'admin',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: '',
        canActivateChild: [permissionGuard],
        loadChildren: () => import('./features/admin/routes/admin.routes').then((m) => m.adminRoutes)
      },
      {
        path: 'tenant/:tenantId/products',
        canActivate: [tenantContextGuard, permissionGuard, featureEntitlementGuard],
        data: {
          requiresTenant: true,
          requiredPermission: catalogPermissions.productView,
          requiredFeature: featureKeys.productCatalog
        },
        loadChildren: () => import('./features/products/routes/products.routes').then((m) => m.productsRoutes)
      },
      {
        path: 'tenant/:tenantId/categories',
        canActivate: [tenantContextGuard, permissionGuard, featureEntitlementGuard],
        data: {
          requiresTenant: true,
          requiredPermission: catalogPermissions.categoryView,
          requiredFeature: featureKeys.categories
        },
        loadChildren: () => import('./features/categories/routes/categories.routes').then((m) => m.categoriesRoutes)
      },
      {
        path: 'tenant/:tenantId/reports',
        canActivate: [tenantContextGuard, permissionGuard, featureEntitlementGuard],
        data: {
          requiresTenant: true,
          requiredPermission: reportPermissions.reportView,
          requiredFeature: featureKeys.reports
        },
        loadChildren: () => import('./features/reports/routes/reports.routes').then((m) => m.reportsRoutes)
      }
    ]
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'admin/dashboard'
  },
  {
    path: '**',
    redirectTo: 'admin/dashboard'
  }
];
