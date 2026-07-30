/**
 * Typed permission codes for Platform Admin route/menu/action guards.
 * Role create/edit loads the full assignable catalogue from
 * GET /api/v1/platform-admin/permission-catalog (37 business codes). */
export const platformPermissions = {
  dashboardView: 'platform.dashboard.view',
  tenantsView: 'platform.tenants.view',
  tenantSubscriptionsView: 'platform.tenant_subscriptions.view',
  tenantsCreate: 'platform.tenants.create',
  tenantsUpdate: 'platform.tenants.update',
  tenantsActivate: 'platform.tenants.activate',
  tenantsSuspend: 'platform.tenants.suspend',
  tenantsEntitlementsUpdate: 'platform.tenants.entitlements.update',
  subscriptionPlansView: 'platform.subscription_plans.view',
  subscriptionPlansCreate: 'platform.subscription_plans.create',
  subscriptionPlansEdit: 'platform.subscription_plans.edit',
  subscriptionPlansDuplicate: 'platform.subscription_plans.duplicate',
  subscriptionPlansArchive: 'platform.subscription_plans.archive',
  subscriptionPlansDelete: 'platform.subscription_plans.delete',
  modulesView: 'platform.modules.view',
  featuresView: 'platform.features.view',
  usersView: 'platform.users.view',
  usersCreate: 'platform.users.create',
  usersUpdate: 'platform.users.update',
  usersRolesAssign: 'platform.users.roles.assign',
  auditView: 'platform.audit.view',
  settingsView: 'platform.settings.view',
  settingsUpdate: 'platform.settings.update',
  billingView: 'platform.billing.view',
  billingManage: 'platform.billing.manage',
  integrationsManage: 'platform.integrations.manage',
  permissionsView: 'platform.permissions.view',
  rolesView: 'platform.roles.view',
  rolesCreate: 'platform.roles.create',
  rolesUpdate: 'platform.roles.update',
  rolePermissionsView: 'platform.roles.permissions.view',
  rolePermissionsUpdate: 'platform.roles.permissions.update',
  returnPolicyTemplatesView: 'platform.return_policy_templates.view',
  returnPolicyTemplatesCreate: 'platform.return_policy_templates.create',
  returnPolicyTemplatesUpdate: 'platform.return_policy_templates.update',
  returnPolicyTemplatesDelete: 'platform.return_policy_templates.delete',
  returnPolicyTemplatesManage: 'platform.return_policy_templates.manage'
} as const;

export const tenantPermissions = {
  outletManage: 'tenant.outlet.manage',
  tillManage: 'tenant.till.manage',
  userManage: 'tenant.user.manage',
  roleManage: 'tenant.role.manage',
  permissionManage: 'tenant.permission.manage',
  productImport: 'tenant.product.import'
} as const;

export const catalogPermissions = {
  productCreate: 'catalog.product.create',
  productUpdate: 'catalog.product.update',
  productView: 'catalog.product.view',
  categoryView: 'catalog.category.view'
} as const;

export const reportPermissions = {
  reportView: 'reports.view',
  reportExport: 'reports.export'
} as const;

/** Platform Admin permission codes used by guards and test fixtures. */
export const allPlatformPermissionCodes = Object.values(platformPermissions);
