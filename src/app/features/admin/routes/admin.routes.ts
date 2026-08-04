import { Routes } from '@angular/router';

import { platformPermissions } from '../../../core/config/permission-keys';
import { permissionGuard } from '../../../core/guards/permission.guard';

const adminPageRoutes: Routes = [
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
    path: 'tenants/onboarding/drafts',
    loadComponent: () => import('../pages/platform-tenant-onboarding-drafts-page/platform-tenant-onboarding-drafts-page').then((m) => m.PlatformTenantOnboardingDraftsPage),
    data: { title: 'Tenant Onboarding Drafts', requiredPermission: platformPermissions.tenantsCreate }
  },
  {
    path: 'tenants/onboarding/operations/:operationId',
    loadComponent: () => import('../pages/platform-tenant-onboarding-result-page/platform-tenant-onboarding-result-page').then((m) => m.PlatformTenantOnboardingResultPage),
    data: { title: 'Tenant Onboarding Status', requiredPermission: platformPermissions.tenantsCreate }
  },
  {
    path: 'tenants/onboarding/:draftId',
    loadComponent: () => import('../pages/platform-create-tenant-page/platform-create-tenant-page').then((m) => m.PlatformCreateTenantPage),
    data: { title: 'Resume Tenant Onboarding', requiredPermission: platformPermissions.tenantsCreate }
  },
  {
    path: 'tenants/:tenantId',
    loadComponent: () =>
      import('../pages/platform-tenant-detail-page/platform-tenant-detail-page').then((m) => m.PlatformTenantDetailPage),
    data: { title: 'Tenant Detail', requiredPermission: platformPermissions.tenantsView }
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
    path: 'return-policy-templates/create',
    loadComponent: () =>
      import('../pages/platform-create-return-policy-template-page/platform-create-return-policy-template-page').then(
        (m) => m.PlatformCreateReturnPolicyTemplatePage
      ),
    data: {
      title: 'Create Return Policy Template',
      requiredPermission: platformPermissions.returnPolicyTemplatesCreate,
      alternatePermissions: [platformPermissions.returnPolicyTemplatesManage]
    }
  },
  {
    path: 'return-policy-templates/:templateId',
    loadComponent: () =>
      import('../pages/platform-return-policy-template-detail-page/platform-return-policy-template-detail-page').then(
        (m) => m.PlatformReturnPolicyTemplateDetailPage
      ),
    data: {
      title: 'Return Policy Template Detail',
      requiredPermission: platformPermissions.returnPolicyTemplatesView,
      alternatePermissions: [platformPermissions.returnPolicyTemplatesManage]
    }
  },
  {
    path: 'return-policy-templates',
    loadComponent: () =>
      import('../pages/platform-return-policy-templates-page/platform-return-policy-templates-page').then(
        (m) => m.PlatformReturnPolicyTemplatesPage
      ),
    data: {
      title: 'Return Policy Templates',
      requiredPermission: platformPermissions.returnPolicyTemplatesView,
      alternatePermissions: [platformPermissions.returnPolicyTemplatesManage]
    }
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
    loadComponent: () =>
      import('../pages/platform-billing-page/platform-billing-page').then((m) => m.PlatformBillingPage),
    data: { title: 'Billing', requiredPermission: platformPermissions.billingView }
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
    path: 'permission-denied',
    loadComponent: () => import('../../../shared/components/permission-denied/permission-denied').then((m) => m.PermissionDenied)
  },
  {
    path: 'feature-not-enabled',
    loadComponent: () => import('../../../shared/components/feature-not-enabled/feature-not-enabled').then((m) => m.FeatureNotEnabled)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];

/**
 * Nested canActivateChild ensures lazy admin pages enforce requiredPermission.
 * Parent app.routes canActivateChild alone does not reliably receive child route data
 * for loadChildren route arrays.
 */
export const adminRoutes: Routes = [
  {
    path: '',
    canActivateChild: [permissionGuard],
    children: adminPageRoutes
  }
];

/** Flat page routes for tests that assert path/data metadata. */
export const adminPageRouteEntries = adminPageRoutes;
