import { Routes } from '@angular/router';

import { platformPermissions, tenantPermissions } from '../../../core/config/permission-keys';
import { tenantContextGuard } from '../../../core/guards/tenant-context.guard';

export const adminRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('../pages/platform-dashboard-page/platform-dashboard-page').then((m) => m.PlatformDashboardPage),
    data: { title: 'Dashboard', requiredPermission: platformPermissions.dashboardView }
  },
  {
    path: 'tenants',
    loadComponent: () =>
      import('../pages/platform-tenant-list-page/platform-tenant-list-page').then((m) => m.PlatformTenantListPage),
    data: { title: 'Tenants', requiredPermission: platformPermissions.tenantsView }
  },
  {
    path: 'tenants/create',
    loadComponent: () =>
      import('../pages/platform-create-tenant-page/platform-create-tenant-page').then((m) => m.PlatformCreateTenantPage),
    data: { title: 'Create Tenant', requiredPermission: platformPermissions.tenantsCreate }
  },
  {
    path: 'tenants/:tenantId',
    loadComponent: () =>
      import('../pages/platform-tenant-detail-page/platform-tenant-detail-page').then((m) => m.PlatformTenantDetailPage),
    data: { title: 'Tenant Detail', requiredPermission: platformPermissions.tenantsView }
  },
  {
    path: 'outlets',
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Outlets', requiredPermission: platformPermissions.tenantsView }
  },
  {
    path: 'tills-devices',
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Tills & Devices', requiredPermission: platformPermissions.tenantsView }
  },
  {
    path: 'products',
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Products', requiredPermission: platformPermissions.tenantsView }
  },
  {
    path: 'alerts',
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Alerts Center', requiredPermission: platformPermissions.dashboardView }
  },
  {
    path: 'subscriptions/create',
    loadComponent: () =>
      import('../pages/platform-create-subscription-plan-page/platform-create-subscription-plan-page').then(
        (m) => m.PlatformCreateSubscriptionPlanPage
      ),
    data: { title: 'Create Subscription Plan', requiredPermission: platformPermissions.subscriptionPlansCreate }
  },
  {
    path: 'subscriptions/:planId',
    loadComponent: () =>
      import('../pages/platform-subscription-plan-detail-page/platform-subscription-plan-detail-page').then(
        (m) => m.PlatformSubscriptionPlanDetailPage
      ),
    data: { title: 'Subscription Plan Detail', requiredPermission: platformPermissions.subscriptionPlansView }
  },
  {
    path: 'subscriptions',
    loadComponent: () =>
      import('../pages/platform-subscription-plans-page/platform-subscription-plans-page').then(
        (m) => m.PlatformSubscriptionPlansPage
      ),
    data: { title: 'Subscription Plans', requiredPermission: platformPermissions.subscriptionPlansView }
  },
  {
    path: 'modules',
    loadComponent: () =>
      import('../pages/platform-modules-catalog-page/platform-modules-catalog-page').then(
        (m) => m.PlatformModulesCatalogPage
      ),
    data: { title: 'Modules and Features', requiredPermission: platformPermissions.modulesView }
  },
  {
    path: 'roles-permissions',
    loadComponent: () =>
      import('../pages/platform-permission-catalog-page/platform-permission-catalog-page').then(
        (m) => m.PlatformPermissionCatalogPage
      ),
    data: { title: 'Roles and Permissions', requiredPermission: platformPermissions.permissionsView }
  },
  {
    path: 'platform-users',
    loadComponent: () =>
      import('../pages/platform-users-page/platform-users-page').then((m) => m.PlatformUsersPage),
    data: { title: 'Platform Users', requiredPermission: platformPermissions.usersView }
  },
  {
    path: 'billing',
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Billing', requiredPermission: platformPermissions.billingView }
  },
  {
    path: 'reports',
    loadComponent: () => import('../pages/admin-section-page/admin-section-page').then((m) => m.AdminSectionPage),
    data: { title: 'Platform Reports', requiredPermission: platformPermissions.dashboardView }
  },
  {
    path: 'settings',
    pathMatch: 'full',
    redirectTo: 'settings/system'
  },
  {
    path: 'settings/system',
    loadComponent: () =>
      import('../pages/platform-system-settings-page/platform-system-settings-page').then(
        (m) => m.PlatformSystemSettingsPage
      ),
    data: { title: 'System Settings', requiredPermission: platformPermissions.settingsView }
  },
  {
    path: 'audit-logs',
    loadComponent: () =>
      import('../pages/platform-audit-logs-page/platform-audit-logs-page').then(
        (m) => m.PlatformAuditLogsPage
      ),
    data: { title: 'Platform Login Audit', requiredPermission: platformPermissions.auditView }
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
