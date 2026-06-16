import { Routes } from '@angular/router';

import { platformPermissions, tenantPermissions } from '../../../core/config/permission-keys';
import { tenantContextGuard } from '../../../core/guards/tenant-context.guard';

export const adminRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('../pages/platform-dashboard-page/platform-dashboard-page').then((m) => m.PlatformDashboardPage)
  },
  {
    path: 'tenants',
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Tenants', requiredPermission: platformPermissions.tenantUpdate }
  },
  {
    path: 'tenants/create',
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Create Tenant', requiredPermission: platformPermissions.tenantCreate }
  },
  {
    path: 'subscriptions',
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Subscription Plans', requiredPermission: platformPermissions.subscriptionManage }
  },
  {
    path: 'modules',
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Modules and Features', requiredPermission: platformPermissions.featureEntitle }
  },
  {
    path: 'roles-permissions',
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Roles and Permissions' }
  },
  {
    path: 'platform-users',
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Platform Users', requiredPermission: platformPermissions.tenantUpdate }
  },
  {
    path: 'billing',
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Billing', requiredPermission: platformPermissions.subscriptionManage }
  },
  {
    path: 'reports',
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Platform Reports' }
  },
  {
    path: 'settings/system',
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'System Settings', requiredPermission: platformPermissions.tenantUpdate }
  },
  {
    path: 'audit-logs',
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Audit Logs', requiredPermission: platformPermissions.auditView }
  },
  {
    path: 'tenant/:tenantId/outlets',
    canActivate: [tenantContextGuard],
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Outlets', requiresTenant: true, requiredPermission: tenantPermissions.outletManage }
  },
  {
    path: 'tenant/:tenantId/tills',
    canActivate: [tenantContextGuard],
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Tills', requiresTenant: true, requiredPermission: tenantPermissions.tillManage }
  },
  {
    path: 'tenant/:tenantId/users',
    canActivate: [tenantContextGuard],
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Tenant Users', requiresTenant: true, requiredPermission: tenantPermissions.userManage }
  },
  {
    path: 'tenant/:tenantId/roles-permissions',
    canActivate: [tenantContextGuard],
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Roles and Permissions', requiresTenant: true, requiredPermission: tenantPermissions.roleManage }
  },
  {
    path: 'tenant/:tenantId/settings',
    canActivate: [tenantContextGuard],
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Tenant Settings', requiresTenant: true, requiredPermission: tenantPermissions.userManage }
  },
  {
    path: 'permission-denied',
    loadComponent: () => import('../../../shared/components/permission-denied/permission-denied').then((m) => m.PermissionDenied)
  },
  {
    path: 'feature-not-enabled',
    loadComponent: () => import('../../../shared/components/feature-not-enabled/feature-not-enabled').then((m) => m.FeatureNotEnabled)
  }
];
