export const platformPermissions = {
  tenantCreate: 'platform.tenant.create',
  tenantUpdate: 'platform.tenant.update',
  tenantActivate: 'platform.tenant.activate',
  subscriptionManage: 'platform.subscription.manage',
  subscriptionPlansView: 'platform.subscription_plans.view',
  subscriptionPlansCreate: 'platform.subscription_plans.create',
  subscriptionPlansEdit: 'platform.subscription_plans.edit',
  subscriptionPlansDuplicate: 'platform.subscription_plans.duplicate',
  subscriptionPlansArchive: 'platform.subscription_plans.archive',
  subscriptionPlansDelete: 'platform.subscription_plans.delete',
  featureEntitle: 'platform.feature.entitle',
  auditView: 'platform.audit.view'
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
